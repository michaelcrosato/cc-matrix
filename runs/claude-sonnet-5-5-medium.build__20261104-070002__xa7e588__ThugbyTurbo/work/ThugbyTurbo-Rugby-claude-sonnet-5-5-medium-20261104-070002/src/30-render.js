/* THUGBY TURBO — presentation: pitch, stadium, rigs, ball, effects, camera. Reads S only. */
E.VIEWS.broadcast = new E.View('broadcast', 'Broadcast', 0, 40, 1, 1);
const { px } = E;
// custom animations (new E.MOVES entries) for rugby
Object.assign(E.MOVES, {
  tackle: { rel: true, hand: 'both', plane: 'side', a0: 1.1, a1: -.2, reach: 5, wind: .08, active: .12, recover: .3, lunge: 3.5, hop: .5, crouch: .55, lean: .6, blade: 0 },
  bighit: { rel: true, hand: 'both', plane: 'side', a0: 2.4, a1: -.3, reach: 6, wind: .22, active: .12, recover: .4, lunge: 5, hop: 1.5, crouch: .7, lean: .8, blade: 0 },
  rugpass: { rel: true, hand: 'both', plane: 'ground', a0: 1.6, a1: -.4, reach: 7, wind: .05, active: .1, recover: .2, lunge: 1, lean: .25, twist: 1.2, blade: 0 },
  rugkick: { rel: true, kick: true, a0: .1, a1: 0, z0: .2, z1: .95, reach: 7, wind: .12, active: .12, recover: .3, lunge: 2, lean: -.2 },
  fendarm: { rel: true, hand: 'L', a0: .05, a1: 0, z0: 0, z1: .5, r0: 3, r1: 10, wind: .04, active: .22, recover: .2, lunge: 1, lean: .1, blade: 0 },
  spinmove: { rel: true, a0: 1.3, a1: 1.3, spin: true, z0: -6, z1: -6, reach: 6, wind: .04, active: .36, recover: .12, lunge: 0, lean: .1, blade: 0 },
  sidestepmv: { rel: true, hand: 'both', plane: 'ground', a0: .4, a1: -.4, reach: 3, wind: .04, active: .15, recover: .12, lean: .3, twist: 1.4, blade: 0 },
  shove: { rel: true, hand: 'both', plane: 'ground', a0: .3, a1: 0, reach: 6, wind: .05, active: .14, recover: .2, lunge: 2.5, lean: .5, blade: 0 }
});
const AMAP = { tackle: 'tackle', dive: 'tackle', bighit: 'bighit', pass: 'rugpass', kick: 'rugkick', fend: 'fendarm', spinmove: 'spinmove', sidestep: 'sidestepmv', bash: 'shove', launched: null, tackled: null };
function moveArgs(name, t) {
  const key = AMAP[name]; if (!key) return null; const s = E.MOVES[key]; const w = s.wind, a = s.active, rc = s.recover, tot = w + a + rc; if (t > tot) return null;
  if (t < w) return E.move(key, t / w, 'wind'); if (t < w + a) return E.move(key, (t - w) / a, 'active'); return E.move(key, (t - w - a) / rc, 'recover');
}
function mkRig(p) {
  const T = S.teams[p.team], R = E.rng(p.id * 977 + 13), skin = T.skin[Math.floor(R() * T.skin.length)];
  const hairs = ['short', 'spiky', 'long', 'ponytail', 'bald'], hairC = ['#2a1a10', '#6b3a1a', '#d8b04a', '#c83a2a', '#202030', '#8a8a96'];
  const rig = new E.Humanoid({ size: p.role <= 2 ? 1.3 : 1.2, build: p.role <= 2 ? 'bulky' : p.role >= 5 ? 'heroic' : 'chibi', weapon: null, outfit: 'shirt', sleeves: 'short', hair: p.immovable ? 'bald' : hairs[Math.floor(R() * hairs.length)], hat: p.role === 1 ? { style: 'band', color: T.c2 } : null,
    colors: { skin, hair: hairC[Math.floor(R() * hairC.length)], cloth: T.c1, coat: T.c1, pants: T.c2, boot: '#1c1c20', belt: T.c2, trim: T.c2, glove: skin } });
  if (p.immovable) rig.size = 1.9;
  return rig;
}
function mkRefRig() { return new E.Humanoid({ size: 1.2, build: 'chibi', weapon: null, outfit: 'shirt', sleeves: 'short', hair: 'short', colors: { skin: '#e8b890', hair: '#6a6a70', cloth: '#18181c', pants: '#18181c', boot: '#101010', trim: '#e8e8e8', belt: '#303030' } }); }

// ---------- the pitch
function buildMapRows() {
  const W = G.MAPW, H = G.MAPH, rows = [];
  for (let y = 0; y < H; y++) { let s = ''; for (let x = 0; x < W; x++) { let c = '.'; if (y <= 2) c = 'ABC'[y]; else if (y === 45) c = 'b'; else if (x === 0) c = 'W'; else if (x === W - 1) c = 'W'; s += c; } rows.push(s); }
  return rows;
}
function buildMap(venue) {
  const gc = venue.grass.map(E.hex), tm = [TT.S.teams[0], TT.S.teams[1]].map(t => E.hex(t.c1));
  const lineAt = (v, c, w = 1.2) => Math.abs(v - c) < w;
  const dashed = (v, c) => lineAt(v, c) && ((Math.floor(v) & 0) === 0);
  const mud = TT.S.mud;
  const floorTex = (x, y) => {
    const inF = x >= G.X0 - G.ING && x <= G.X1 + G.ING && y >= G.Y0 && y <= G.Y1, nx = E.noise2(x * .09, y * .09);
    let c;
    if (!(x >= G.X0 - G.ING - 48 && x <= G.X1 + G.ING + 48 && y >= G.Y0 - 48 && y <= G.Y1 + 48)) return [30, 60, 34];
    const stripe = Math.floor(x / 32) & 1; c = gc[stripe].slice(); c = [c[0], c[1], c[2]];
    const n = (nx - .5) * 16; c = [c[0] + n, c[1] + n * 1.2, c[2] + n * .6];
    if (!inF) { c = [c[0] * .82, c[1] * .85, c[2] * .82]; }
    else if (x < G.X0 || x > G.X1) { const t = tm[x < G.X0 ? (TT.S.dir[0] > 0 ? 0 : 1) : (TT.S.dir[0] > 0 ? 1 : 0)]; c = [c[0] * .6 + t[0] * .28, c[1] * .6 + t[1] * .28, c[2] * .6 + t[2] * .28]; }
    for (const m of mud) { const d = Math.hypot(x - m.x, y - m.y); if (d < m.r) { const k = d < m.r * .55 ? 1 : .7; c = [90 * k + c[0] * (1 - k), 64 * k + c[1] * (1 - k), 36 * k + c[2] * (1 - k)]; if (d < m.r * .3 && E.hash2(Math.floor(x / 3), Math.floor(y / 3)) > .6) c = [130, 110, 80]; } }
    let w = false; const inY = y >= G.Y0 - 1 && y <= G.Y1 + 1;
    if (inY && (lineAt(x, G.X0) || lineAt(x, G.X1) || lineAt(x, G.CX) || lineAt(x, G.X0 - G.ING) || lineAt(x, G.X1 + G.ING))) w = true;
    if (inY && (lineAt(x, G.X0 + 225) || lineAt(x, G.X1 - 225)) && x > 0) w = true;
    if (inY && (lineAt(x, G.CX - 102) || lineAt(x, G.CX + 102) || lineAt(x, G.X0 + 51) || lineAt(x, G.X1 - 51)) && (Math.floor(y / 14) & 1)) w = true;
    if (x >= G.X0 - G.ING - 1 && x <= G.X1 + G.ING + 1 && (lineAt(y, G.Y0) || lineAt(y, G.Y1))) w = true;
    if (x >= G.X0 && x <= G.X1 && (lineAt(y, G.Y0 + 51) || lineAt(y, G.Y0 + 154) || lineAt(y, G.Y1 - 154) || lineAt(y, G.Y1 - 51)) && (Math.floor(x / 14) & 1)) w = true;
    if (w) return [236, 240, 232];
    return [E.clamp(c[0], 0, 255), E.clamp(c[1], 0, 255), E.clamp(c[2], 0, 255)];
  };
  const types = { A: 0, B: 0 };
  const map = new E.TileMap({ rows: buildMapRows(), legend: { '.': 0, A: 1, B: 2, C: 3, b: 4, W: 5 },
    types: { 1: { h: 54, top: '#3a3a46', side: '#58586a', face: 'stone' }, 2: { h: 44, top: '#44444f', side: '#656578', face: 'stone' }, 3: { h: 34, top: '#505060', side: '#72728a', face: 'stone' }, 4: { h: 14, top: '#e8e8e8', side: '#2a2a3a', face: 'plank', cut: true, cutH: 4 }, 5: { h: 30, top: '#444450', side: '#606072', face: 'stone' } },
    floorTex, ao: 0, outside: '#20402a' });
  return map;
}

// ---------- scene-wide view state
const V = { map: null, rigs: [], refRig: null, chickRig: null, t: 0, camX: 0, camY: 0, shakeX: 0, fxText: [], replay: null, letter: 0, mouse: null, crowdWave: 0, hover: -1 };
TT.V = V;
function initView() {
  const game = TT.game; V.map = buildMap(S.venue); game.cam.bounds = v => V.map.bounds(v);
  V.rigs = S.players.map(mkRig); V.refRig = mkRefRig();
  V.chickRig = new E.Blob({ R: 11, colors: { dk: '#c8c8c0', base: '#f4f4ee', lt: '#ffffff', spec: '#ffffff', eye: '#101010', pupil: '#000000' }, wings: true, feet: true, tail: true, mouth: true, ears: 'cat' });
  V.fxText = []; V.replay = null; V.letter = 0;
  game.lights.enabled = true; game.lights.ambient = Math.min(1, S.venue.ambient + .3); game.weather = S.venue.weather ? Object.assign({}, S.venue.weather) : null;
  game.setView(TT.settings.cam || 'broadcast');
}
function rigArgs(p, dt) {
  const a = { x: p.x, y: p.y, z: p.z, vx: p.vx, vy: p.vy, facing: p.facing };
  const st = p.st, m = moveArgs(p.am, p.amT);
  if (st === 'ground') { a.pose = 'down'; a.vx = a.vy = 0; }
  else if (st === 'getUp') { a.pose = 'kneel'; a.vx = a.vy = 0; }
  else if (st === 'air') { a.flip = (p.amT * 1.6) % 1; a.air = true; a.expr = 'shout'; }
  else if (st === 'fall') { a.pose = 'crouch'; a.expr = 'wince'; }
  else if (st === 'stun') { a.pose = 'crouch'; a.expr = 'wince'; }
  else if (st === 'celebrate') { a.pose = ['cheer', 'hips', 'wave', 'cheer'][p.celeb | 0]; a.vx = a.vy = 0; a.expr = 'shout'; }
  else if (st === 'binned') { a.pose = 'kneel'; a.vx = a.vy = 0; }
  else if (st === 'scrum') { a.pose = 'crouch'; a.vx = a.vy = 0; a.lean = .5; }
  else if (st === 'lineout') { a.vx = a.vy = 0; if (p.z > 5) a.pose = 'cheer'; }
  else if (st === 'diving') { a.flip = .0; a.pose = 'down'; a.air = true; }
  else if (st === 'charge') { a.sprint = true; a.expr = 'angry'; }
  if (S.phase === 'ruck' && p.flags.ruck) { a.pose = 'crouch'; a.vx = a.vy = 0; }
  if (m && st !== 'ground') a.attack = m;
  if (p.superKind && st !== 'ground') { a.sprint = true; a.expr = 'shout'; }
  if (S.ball.holder === p && !m && st === 'run') { a.stance = 'ready'; }
  return a;
}
// ---------- effects
TT.hitFx = (p, power) => { if (!TT.cfg.present || !TT.game) return; const g = TT.game; g.particles.impact(p.x, p.y, 16, 8 * power + 4, '#fff4b0'); g.particles.dust(p.x, p.y, 2, 8); if (power >= 1) { g.freeze(.09 * power); g.shake(3 * power); g.flash('#ffffff', .08, .35); } S.shake = Math.max(S.shake, 2 * power); };
TT.fxDust = (x, y) => { if (TT.game) TT.game.particles.dust(x, y, 2, 6); };
bus.on('try', d => { if (!TT.cfg.present) return; V.crowdWave = 4; const g = TT.game, p = S.players[d.id]; g.particles.explosion(p.x, p.y, 20, 1.4, { freeze: false }); for (let i = 0; i < 5; i++) g.particles.glints(p.x + (i - 2) * 14, p.y - 10, 30, 6, ['#ffe070', '#ff80a0', '#80e0ff'][i % 3]); g.flash('#fff4c0', .2, .4); if (S.venue.hazard === 'flames') for (let i = 0; i < 6; i++) g.particles.fire(p.x + (i - 3) * 22, p.y, 4, 8, { size: 2 }); });
bus.on('hazard', d => { if (!TT.cfg.present) return; if (d.kind === 'lightning') { TT.game.flash('#ffffff', .22, .7); TT.game.shake(5); TT.game.particles.explosion(d.x, d.y, 4, 1.2, { freeze: false }); } });
bus.on('monsterHit', d => { if (!TT.cfg.present) return; const p = S.players[d.on]; TT.game.particles.explosion(p.x, p.y, 16, 1.2, { freeze: false }); });
bus.on('toasted', d => { if (!TT.cfg.present) return; const p = S.players[d.id]; if (d.kind === 'flame') TT.game.particles.fire(p.x, p.y, 8, 12, { size: 2 }); else TT.game.particles.sparks(p.x, p.y, 20, 16, 0); });
bus.on('sidestep', d => { if (!TT.cfg.present) return; const p = S.players[d.id]; TT.game.particles.dust(p.x, p.y, 1, 4); });
bus.on('kick', d => { if (!TT.cfg.present) return; const p = S.players[d.id]; TT.game.particles.dust(p.x, p.y, 1, 3); });
bus.on('powerupTake', d => { if (!TT.cfg.present) return; const p = S.players[d.id]; TT.game.particles.glints(p.x, p.y, 20, 10, POWERUPS[d.kind].color); });

// ---------- camera
function camUpdate(dt) {
  const g = TT.game, b = S.ball; let fx = b.x, fy = b.y, fz = 8;
  if (V.replay) { const k = V.replay.key; fx = k.x; fy = k.y; }
  else if (b.holder) { const d = S.dir[b.holder.team]; fx = b.holder.x + d * 50; fy = b.holder.y; fx = b.holder.x + b.holder.vx * .25 + d * 30; }
  else if (b.st === 'kick' && S.kickInfo && b.z > 20) { fx = (b.x + S.kickInfo.x) / 2; fy = (b.y + S.kickInfo.y) / 2; }
  if (S.sp && (S.phase === 'scrum' || S.phase === 'lineout' || S.phase === 'penalty' || S.phase === 'kick')) { fx = S.sp.x; fy = S.phase === 'lineout' ? S.sp.ty + (S.sp.side < 0 ? 60 : -60) : S.sp.y; if (S.phase === 'kick') { fx = (S.sp.x + atkX(S.sp.team)) / 2; fy = lerp(S.sp.y, G.CY, .5); } }
  if (S.phase === 'try' && S.sp) { fx = S.sp.x; fy = S.sp.y; }
  fy = lerp(fy, G.CY, .25);
  g.focus(fx + (S.shake ? (Math.random() - .5) * S.shake : 0), fy, fz);
}
