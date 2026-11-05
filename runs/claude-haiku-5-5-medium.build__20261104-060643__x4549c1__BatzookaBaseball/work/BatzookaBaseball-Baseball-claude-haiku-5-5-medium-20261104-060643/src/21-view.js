// The look: the field (a TileMap in the Broadcast view: grass, the dirt, the chalk, the fence and the stands), the Plate Cam
// (a perspective drawn in screen pixels, from 8 ft behind the plate), the players as Humanoid rigs, and the HUD.
// Nothing here changes the game; the scenes call these to draw what the state says.

// ---- the players ------------------------------------------------------------------------------------------------------
BZ.rigFor = (team, o = {}) => new E.Humanoid(Object.assign({
  size: 1.25, build: o.build || 'heroic', hat: o.hat === undefined ? team.hat : o.hat, weapon: null, sleeves: 'short', outfit: 'shirt',
  hair: o.hair || 'short',
  colors: { skin: team.skin, hair: team.hair, cloth: team.cloth, pants: team.pants, boot: team.boot, belt: team.trim,
            trim: team.trim, glove: '#8a5a2a', metal: '#dadada', plate: team.trim, eye: '#1a1a1a', iris: '#2a2a40' }
}, o.extra || {}));

// One team's players on the field: the nine fielders, the pitcher and catcher, a batter, and three runner's rigs.
BZ.makeRigs = team => {
  const rigs = { fielders: {}, runners: [] };
  for (const role of BZ.ROLES) rigs.fielders[role] = BZ.rigFor(team, { build: role === 'C' ? 'bulky' : 'heroic' });
  rigs.far = BZ.rigFor(team, { build: 'heroic', extra: { size: .6 } });     // the pitcher, far down the Plate Cam's field
  rigs.batter = BZ.rigFor(team, { build: 'heroic', hair: 'spiky' });
  rigs.runners = [0, 1, 2].map(() => BZ.rigFor(team, { build: 'chibi' }));
  return rigs;
};
BZ.umpireRig = () => BZ.rigFor({ hat: 'cap', skin: '#c89070', hair: '#3a2a20', cloth: '#1f2a3a', pants: '#1a1a22', boot: '#101010', trim: '#e8e8e8' }, { build: 'bulky' });

// ---- the field -------------------------------------------------------------------------------------------------------
// The floor is painted from the world's geometry, so the lines and the dirt sit where the rules put them.
BZ.fieldFloor = (x, y) => {
  const dx = x - BZ.HX, dy = y - BZ.HY, r = Math.hypot(dx, dy);
  const th = BZ.thetaOf(x, y), fair = Math.abs(th) <= 45;
  const park = BZ.PARKS[BZ.park] || BZ.PARKS.kernel;
  const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  const speck = (hash - Math.floor(hash)) * .06;
  const stripe = Math.floor(y / 56) % 2;
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  let base = hex(stripe ? park.grass : park.grass2);
  if (fair && r <= 300) base = hex(park.dirt);                                   // the infield
  if (fair && r > BZ.fenceAt(th) - 38 && r <= BZ.fenceAt(th)) base = hex(park.dirt);   // the warning track
  // the foul lines, 2 U wide, from home out along 45 degrees
  const d1 = Math.abs(dx * .7071 + dy * .7071), d2 = Math.abs(dx * .7071 - dy * .7071);
  const along1 = dx * .7071 - dy * .7071, along2 = -dx * .7071 - dy * .7071;
  if ((d1 < 2.2 && along1 > 0) || (d2 < 2.2 && along2 > 0)) base = hex(park.chalk);
  // the basepaths and the bases
  for (const b of BZ.bases().slice(0, 3)) {
    if (Math.abs(x - b.x) < 10 && Math.abs(y - b.y) < 10) base = hex('#ffffff');
  }
  if (Math.hypot(x - BZ.MOUND.x, y - BZ.MOUND.y) < 24) base = hex('#c49a62');
  if (Math.abs(x - BZ.HX) < 9 && Math.abs(y - BZ.HY) < 9) base = hex('#ffffff');
  return [Math.min(255, base[0] + speck * 255), Math.min(255, base[1] + speck * 255), Math.min(255, base[2] + speck * 255)];
};

// The field's floor and walls, drawn for any view of the field (a match, a derby, a ball's flight).
BZ.drawFieldBase = r => { BZ.field.drawFloor(r); BZ.field.queueWalls(r); };

// The map: cells of 16 U. Fence cells sit on the fair arc, the stands behind them, open ground everywhere else.
BZ.buildField = () => {
  const rows = [];
  for (let cy = 0; cy < BZ.MAP_H; cy++) {
    let row = '';
    for (let cx = 0; cx < BZ.MAP_W; cx++) {
      const x = cx * BZ.CELL + 8, y = cy * BZ.CELL + 8;
      const r = Math.hypot(x - BZ.HX, y - BZ.HY), th = BZ.thetaOf(x, y);
      const F = BZ.fenceAt(th);
      let ch = '.';
      if (Math.abs(th) <= 45) {
        if (r >= F && r < F + 28) ch = '#';          // the fence
        else if (r >= F + 28 && r < F + 110) ch = '$';    // the stands
      }
      row += ch;
    }
    rows.push(row);
  }
  const map = new E.TileMap({
    rows, legend: { '#': 1, '$': 2, '.': 0 },
    types: {
      1: { h: BZ.FENCE_H, top: '#2c5e2c', side: '#2a4a2e', face: 'plank', cut: true },
      2: { h: 70, top: '#4a3a5a', side: '#2c2436', face: 'brick', roof: 'speckle', cut: true }
    },
    floorTex: BZ.fieldFloor,
    outside: '#2f5a2a'
  });
  return map;
};

// ---- the Plate Cam ---------------------------------------------------------------------------------------------------
// A glance at the scene's ground: the grass and the dirt of the infield, the mound, the plate, the box and the zone.
BZ.drawPlateGround = (g, W, H, park) => {
  const hor = Math.round(H * BZ.HORIZON);
  const [t0, t1] = park.night ? ['#0c1430', '#1d3a2a'] : ['#7fb4e6', '#f2c88a'];
  E.px.rect(g, 0, 0, W, hor, '#000');
  // the stands: dark tiers with a crowd of coloured dots
  for (let row = 0; row < 5; row++) {
    const y = Math.round(hor - 30 + row * 6);
    E.px.rect(g, 0, y, W, 6, row % 2 ? '#2a2236' : '#332a44');
  }
  for (let i = 0; i < 260; i++) {
    const x = (i * 37) % W, y = Math.round(hor - 26 + ((i * 13) % 26));
    E.px.rect(g, x, y, 2, 2, ['#e8443a', '#3b82f6', '#f5b700', '#ffffff', '#22c55e', '#c084fc'][i % 6]);
  }
  E.px.rect(g, 0, hor, W, H - hor, park.grass);
  E.px.rect(g, 0, hor, W, 2, t1);
  // the infield's dirt: a wedge from the plate to the mound and the base lines
  const P = (lat, h, d) => BZ.project(lat, h, d, W, H);
  const dirt = [P(-6, 0, 0), P(6, 0, 0), P(18, 0, 60), P(-18, 0, 60)].map(p => [p.x, p.y]);
  E.px.poly(g, dirt, park.dirt);
  const mound = P(0, 0, 60.5), mr = Math.max(3, 4 * mound.s);
  E.px.ell(g, mound.x, mound.y, mr * 1.6, mr * .6, '#c49a62');
  // the batter's box and the plate
  const bx = [P(-3.5, 0, -1), P(-1.2, 0, -1), P(-1.2, 0, 5), P(-3.5, 0, 5)].map(p => [p.x, p.y]);
  E.px.poly(g, bx, '#ddd6c0');
  const plate = [P(-.71, 0, 0), P(.71, 0, 0), P(.71, 0, -.5), P(0, 0, -1), P(-.71, 0, -.5)].map(p => [p.x, p.y]);
  E.px.poly(g, plate, '#ffffff');
};

// The strike zone, drawn on the plate's plane, and the pitch's path behind the ball.
BZ.drawZone = (g, W, H) => {
  const Z = BZ.ZONE, P = (lat, h) => BZ.project(lat, h, 0, W, H);
  const a = P(Z.lo, Z.bot), b = P(Z.hi, Z.bot), c = P(Z.hi, Z.top), d = P(Z.lo, Z.top);
  for (const [p, q] of [[a, b], [b, c], [c, d], [d, a]]) E.px.line(g, p.x, p.y, q.x, q.y, '#ffffff', 1);
};

// The players in the Plate Cam's space: the pitcher far down the field (a smaller rig), the batter at the plate's side.
BZ.drawPlatePlayers = (g, W, H, sc) => {
  const at = (rig, lat, depth) => { const p = BZ.project(lat, 0, depth, W, H); rig.draw(g, Math.round(p.x), Math.round(p.y), sc.view); };
  if (sc.pitcher) at(sc.pitcher, 0, BZ.PLATE.dist - 2);
  if (sc.batter) at(sc.batter, -2.1, 1.2);
};

// The batter's bat. At rest it is on the shoulder, held at the hands; the swing (k 0..1) brings the head through the
// zone to the reticle's place. Drawn in the Plate Cam's space, from the hands to the head.
BZ.drawBat = (g, W, H, sc) => {
  const P = (lat, h, d) => BZ.project(lat, h, d, W, H);
  const hands = P(-2.1, 2.7, 1.2);
  const rest = P(-3.0, 3.9, 1.2);
  const k = BZ.clamp(sc.swing, 0, 1);
  const eased = k * k * (3 - 2 * k);
  const head = P(BZ.lerp(-3.0, sc.reticle.lat, eased), BZ.lerp(3.9, sc.reticle.h, eased), BZ.lerp(1.2, 0.2, eased));
  const tip = k > 0 ? head : rest;
  E.px.line(g, hands.x, hands.y, tip.x, tip.y, '#c89a5a', Math.max(2, Math.round(hands.s * .32)));
  E.px.line(g, hands.x, hands.y, tip.x, tip.y, '#7a4a20', 1);
};

// The ball, in the Plate Cam at its place on the path (t 0..1) with a trail and a shadow.
BZ.drawPitchBall = (g, W, H, plan, t, trail) => {
  const pos = BZ.pitchAt(plan, t);
  const p = BZ.project(pos.lat, pos.h, pos.depth, W, H);
  const shadow = BZ.project(pos.lat, 0, pos.depth, W, H);
  E.px.ell(g, shadow.x, shadow.y, Math.max(1, .7 * shadow.s), Math.max(1, .25 * shadow.s), '#0000001f');
  for (let i = 0; i < trail.length; i++) {
    const q = trail[i];
    const a = BZ.project(q.lat, q.h, q.depth, W, H);
    E.px.disc(g, a.x, a.y, Math.max(1, .5 * a.s * (i / trail.length)), '#ffffff55');
  }
  E.px.disc(g, p.x, p.y, Math.max(2, .28 * p.s), '#ffffff');
  E.px.disc(g, p.x - .1 * p.s, p.y - .1 * p.s, Math.max(1, .12 * p.s), '#ffffffcc');
};

// ---- the HUD ---------------------------------------------------------------------------------------------------------
BZ.text = (g, s, x, y, color, o = {}) => E.font.text(g, s, x, y, color, Object.assign({ shadow: '#000' }, o));

// The scorebug: the two teams, the runs by inning, the count, the outs and the diamond.
BZ.drawScorebug = (g, S, x, y) => {
  const w = 240, h = 64;
  E.ui.box(g, x, y, w, h, { bg: ['#1a1d2a', '#0b0d16'], border: '#c8a060', alpha: .9 });
  [0, 1].forEach(t => {
    const yy = y + 7 + t * 19, batting = BZ.battingTeam(S) === t;
    E.px.rect(g, x + 7, yy + 2, 5, 13, BZ.TEAMS[t].color);
    BZ.text(g, BZ.TEAMS[t].short, x + 17, yy + 3, '#ffffff', { scale: 1.5 });
    BZ.text(g, String(S.score[t]), x + 170, yy + 2, '#ffe6a0', { scale: 1.8, align: 'right' });
    if (batting) E.px.poly(g, [[x + 180, yy + 3], [x + 186, yy + 9], [x + 180, yy + 15]], '#ffe6a0');
  });
  BZ.text(g, (S.top ? 'TOP ' : 'BOT ') + S.inning, x + w - 8, y + 7, '#c8d0f0', { scale: 1.1, align: 'right' });
  // the count on one line: balls, strikes, outs
  const dots = (cx, on, n, c) => { for (let i = 0; i < n; i++) E.px.disc(g, cx + i * 9, y + 50, 3, i < on ? c : '#2a2e40'); };
  BZ.text(g, 'B', x + 8, y + 44, '#7ad06a', { scale: 1.1, shadow: null }); dots(x + 20, S.balls, 4, '#7ad06a');
  BZ.text(g, 'S', x + 62, y + 44, '#ffb020', { scale: 1.1, shadow: null }); dots(x + 74, S.strikes, 3, '#ffb020');
  BZ.text(g, 'O', x + 110, y + 44, '#ff5a4a', { scale: 1.1, shadow: null }); dots(x + 122, S.outs, 3, '#ff5a4a');
  // the diamond, right side: occupied bases lit
  const cx = x + w - 30, cy = y + 36, b = S.bases;
  E.px.poly(g, [[cx, cy - 11], [cx + 11, cy], [cx, cy + 11], [cx - 11, cy]], '#2a5a2a');
  const pts = [[cx + 11, cy], [cx, cy - 11], [cx - 11, cy]];
  pts.forEach((p, i) => E.px.rect(g, p[0] - 3, p[1] - 3, 6, 6, b[i] ? '#ffe6a0' : '#8a92b0'));
  E.px.rect(g, cx - 2, cy + 9, 4, 4, '#ffffff');
};

// The release meter: a bar with the sweet spot in its middle and a marker that sweeps. p is the marker (0..1).
BZ.drawMeter = (g, x, y, w, p) => {
  E.ui.box(g, x - 4, y - 4, w + 8, 16, { bg: ['#101420', '#080a12'], border: '#c8a060', alpha: .9 });
  const half = BZ.TUNE.releaseSweet / 2;
  E.px.rect(g, x + w * (.5 - half), y, Math.max(1, w * half * 2), 8, '#7ad06a');
  E.px.rect(g, x + w * p - 2, y - 3, 4, 14, '#ffffff');
};

// A meter for the Batzooka (or the Fireball): full when it's ready.
BZ.drawBatzookaMeter = (g, x, y, w, value, label, ready) => {
  BZ.text(g, label, x, y - 12, ready ? '#ffe6a0' : '#c8d0f0', { scale: 1.2 });
  E.ui.bar(g, x, y, w, 8, BZ.clamp(value / 100, 0, 1), ready ? '#ffb020' : '#ff7a3a');
  if (ready) BZ.text(g, BZ.prompt('power', 'USE'), x + w + 8, y - 2, '#ffe6a0', { scale: 1.2 });
};

// The prompt for an action on the device used last (glyphs follow the input). An empty label shows the action name.
BZ.prompt = (action, verb) => {
  const g = BZ.game;
  const l = g && g.input ? g.input.label(action) : '';
  return (l ? l + ' ' : '') + verb;
};

// A stamp: a large line in the middle of the screen, for the umpire's call and the play's result.
BZ.drawStamp = (g, W, H, s, col, sub) => {
  if (!s) return;
  const cx = W / 2, cy = H * .5;
  E.font.title(g, s.text, cx, cy, { scale: 3, colors: [col, '#ffffff'], outline: '#000000', align: 'center' });
  if (sub) BZ.text(g, sub, cx, cy + 34, '#ffffff', { align: 'center', scale: 1.4 });
};
