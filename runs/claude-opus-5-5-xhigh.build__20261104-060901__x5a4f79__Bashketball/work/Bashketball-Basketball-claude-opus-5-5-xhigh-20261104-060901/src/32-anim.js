/* 32-anim: the basketball layer over the engine's procedural rig. The rig poses itself (walk, run, jump tuck, knockdown,
 * flips, faces); a pose layer wrapped round rig.solvePose then moves the hands with two-bone IK to the targets of the
 * current clip (06-data-moves): hands that hold and dribble the ball, shooting form, dunk choreography, hanging on the
 * rim, celebrations and taunts. The dribble is procedural and drives the ball itself; the ball rides the hands. */
const V3 = E.V3, HEROIC_SH = 23.9;
function installPoseLayer(rig) { const base = rig.solvePose; rig.solvePose = function () { base.call(this); poseLayer(this); }; }
function poseLayer(rig) {
  const bb = rig.bb, P = bb && bb.pose; if (!P || bb.w <= .001 || !rig.J.shR) return;
  const o = rig.o, J = rig.J, w = Math.min(1, bb.w), kr = (o.armUpper + o.armLower) / 10.9;
  for (const s of [1, -1]) {
    const T = s > 0 ? P.R : P.L; if (!T) continue;
    const sh = s > 0 ? J.shR : J.shL, hand = s > 0 ? J.handR : J.handL;
    const tgt = P.abs ? T : [J.shC[0] + T[0] * kr, J.shC[1] + T[1] * kr, J.shC[2] + (T[2] - HEROIC_SH) * kr];
    const goal = V3.lerp(hand, tgt, w), [el, h2] = E.ik3(sh, goal, o.armUpper, o.armLower, P.hint ? [P.hint[0], s * P.hint[1], P.hint[2]] : [-1, s * .8, -.15]);
    J[s > 0 ? 'elbowR' : 'elbowL'] = el; J[s > 0 ? 'handR' : 'handL'] = h2;
  }
}
/** a world offset (from the rig's feet) turned into the rig's own frame at size 1 (the inverse of rig.worldOffset) */
function toLocal(rig, dx, dy, dz) {
  const a = rig.facing + rig.spin + (rig._cheat || 0), c = Math.cos(a), s = Math.sin(a), k = (1 - rig.sq * .4) * rig.o.size, kz = (1 + rig.sq) * rig.o.size;
  return [(dx * c + dy * s) / k, (-dx * s + dy * c) / k, dz / kz];
}
/** where the ball sits for a pose: in the hands ('both'), the right hand ('R'), or the dribble; a world point */
function ballAnchor(p, P) {
  const rig = p.rig, J = rig.J, br = BALL_R / rig.o.size;
  if (!P || !P.ball) return null;
  let loc;
  if (P.ball === 'dribble') loc = P.ballLoc;
  else if (P.ball === 'both') { const m = V3.lerp(J.handR, J.handL, .5); loc = V3.add(m, [br * .55, 0, J.handR[2] > J.shC[2] ? br * .4 : 0]); }
  else { const h = P.ball === 'L' ? J.handL : J.handR; loc = V3.add(h, h[2] > J.shC[2] + 2 ? [.4, 0, br * .95] : [br * .8, 0, -br * .2]); }
  const w = rig.worldOffset(loc); return [rig.x + w[0], rig.y + w[1], rig.z + w[2]];
}
/** the procedural dribble: the ball falls from the hand to the floor and back as two parabolas; the hand meets it at the
 *  top; a crossover swaps sides in front of the body */
function dribblePose(p, dt) {
  const D = p.dribble, o = p.rig.o, sz = o.size, br = BALL_R / sz, moving = Math.hypot(p.vx, p.vy) > 25;
  const rate = p.turboOn ? 3.8 : moving ? 3.0 : 2.2, before = D.ph;
  D.ph += rate * dt; if (D.ph >= 1) D.ph -= 1;
  if (before < .5 && D.ph >= .5 && p.z < 1) { sfx(ARENA.court ? ARENA.court.dribble : 'dribble_maple', { vol: .32, at: p }); emit('dribble', { slot: p.slot }); }
  // crossover: a sharp turn, or a defender reaching at the dribble side
  const foe = p.foes.find(q => dist2(q.x, q.y, p.x, p.y) < 22);
  if (foe) { const rel = toLocal(p.rig, foe.x - p.x, foe.y - p.y, 0); if (Math.sign(rel[1]) === D.side && D.ph < .5 && D.cross <= 0) { D.side = -D.side; D.cross = .5; } }
  D.cross = Math.max(0, D.cross - dt);
  D.lat = approach(D.lat === undefined ? 6 : D.lat, D.side * 6, dt * 46);
  const zt = o.hipZ * .92 - br, zb = br, f = D.ph;
  const z = f < .5 ? zt - (zt - zb) * (f / .5) ** 2 : zb + (zt - zb) * (1 - ((1 - f) / .5) ** 2);
  const ballLoc = [5.2 / sz * 1.6, D.lat / sz * 1.3, z];
  const contact = f > .85 || f < .15, hs = Math.sign(D.lat) || D.side;
  const handT = contact ? [ballLoc[0], ballLoc[1], z + br + .4] : [ballLoc[0] - .3, ballLoc[1], zt + br + 1.4];
  const off = [3.8, -hs * 4.6, o.hipZ + 2.5];
  return hs > 0 ? { abs: true, R: handT, L: off, ball: 'dribble', ballLoc } : { abs: true, L: handT, R: off, ball: 'dribble', ballLoc };
}
/** interpolate a dunk's hand keys at progress u (eased between keys) */
function dunkKeys(def, u) {
  const K = def.keys; let a = K[0], b = K[K.length - 1];
  for (let i = 0; i < K.length - 1; i++) if (u >= K[i][0] && u <= K[i + 1][0]) { a = K[i]; b = K[i + 1]; break; }
  if (u > K[K.length - 1][0]) { a = b; }
  const k = a === b ? 0 : E.ease.inOutSine((u - a[0]) / (b[0] - a[0])), out = {};
  for (const h of ['R', 'L']) { const A2 = a[1][h] || (b[1][h]), B2 = b[1][h] || A2; out[h] = A2 && B2 ? V3.lerp(A2, B2, k) : null; }
  return out;
}
/** pick the pose for a player's state this step, update its rig, and place the ball if it rides the hands */
function animStep(p, dt) {
  const rig = p.rig, bb = rig.bb, b = S.ball;
  let P = null, air = false, flip = 0, spin = 0, down = 0, hurt = false, pose = null, expr = null, hop = 0, turn = 0, land = 0;
  const holding = b && b.owner === p && (b.state === 'held' || b.state === 'dunk');
  const clip = (id, t, x) => CLIPS[id] ? CLIPS[id](t, x || {}) : null;
  switch (p.state) {
    case 'run':
      if (p.act) P = clip(p.act.id, p.act.t);
      else if (holding) P = p.holdT > 0 ? clip('hold', p.st) : dribblePose(p, dt);
      else if (p.call > 0) P = clip('call', p.st);
      else if (b && b.state === 'pass' && b.pass && b.pass.to === p && b.pass.T - b.pass.t < .35) P = clip('catch', 0);
      else { const h = b && b.state === 'held' ? b.owner : null; if (h && h.team !== p.team && dist2(h.x, h.y, p.x, p.y) < 60) P = clip('defense', p.st, { hands: h.state === 'air' || h.state === 'gather' }); }
      break;
    case 'gather': P = clip('gather', p.st); break;
    case 'air': {
      air = p.z > 3; const J2 = p.jump || {};
      if (J2.kind === 'shot') P = clip('jumpshot', p.st, { released: J2.released });
      else if (J2.kind === 'layup') P = clip('layup', p.st, { u: J2.T ? p.st / J2.T : 0, released: J2.released });
      else if (J2.kind === 'block') P = clip('block', p.st, { swat: J2.swatT > 0 ? J2.swatT / .15 : 0 });
      else if (J2.kind === 'rebound') P = clip('rebound', p.st, { got: holding });
      else if (J2.kind === 'tip') P = clip('tipoff', p.st, {});
      else if (holding) P = clip('rebound', p.st, { got: true });
      if (J2.kind === 'drop' && p.dunkDef && p.dunkDef.split) P = { R: [4, 4, 30], L: [4, -4, 30] };
      break;
    }
    case 'dunk': {
      const d = p.dunk, u = clamp(d.t / d.T, 0, 1), def = d.def;
      P = dunkKeys(def, u); P.ball = holding ? (def.hands === 1 ? 'R' : 'both') : null; air = true;
      if (def.spin) { const [u0, u1] = def.spinU; spin = -TAU * def.spin * E.ease.inOutSine(clamp((u - u0) / (u1 - u0), 0, 1)); }
      if (def.flip) { const [u0, u1] = def.flipU; const k = clamp((u - u0) / (u1 - u0), 0, 1); flip = k > 0 && k < 1 ? k : 0; }
      if (def.reverse && u > .35) turn = PI;
      expr = u > .6 ? 'shout' : null;
      if (d.oop && !holding && b && b.state === 'pass') P = { R: [6, 2, 44], L: [6, -2, 44] };
      break;
    }
    case 'hang': {   // hands on the rim (two points of the ring, turned into the rig's frame), legs swinging below
      const rim = attackRim(p.team), a = Math.atan2(p.y - rim.y, p.x - rim.x), L2 = [];
      for (const s of [1, -1]) { const ra = a + s * .55, wx = rim.x + Math.cos(ra) * RIM_R - p.x, wy = rim.y + Math.sin(ra) * RIM_R - p.y; L2.push(toLocal(rig, wx, wy, RIM_Z - p.z)); }
      P = { abs: true, R: L2[1], L: L2[0], hint: [-1, .6, -.3] }; air = true; expr = 'shout';
      break;
    }
    case 'knock': down = p.st < p.kdT - .25 ? 1 : 0; hurt = p.st < .3; expr = 'wince'; break;
    case 'getup': down = 0; break;
    case 'spin': P = clip('spin', p.st); P.ball = holding ? 'R' : null; spin = -TAU * clamp(p.st / .35, 0, 1); break;
    case 'steal': P = clip('steal', p.st); break;
    case 'shove': P = clip('shove', p.st); expr = 'angry'; break;
    case 'stumble': hurt = true; expr = 'wince'; P = { R: [2, 9, 26], L: [2, -9, 30] }; break;
    case 'frozen': hurt = (Math.floor(p.st * 12) % 2) === 0; P = { R: [6, 3, 14 + (Math.floor(p.st * 9) % 3) * 6], L: [3, -6, 20] }; break;
    case 'cele': case 'taunt': { const c = clip(p.clip, p.st); P = c; if (c) { expr = c.expr || 'smile'; hop = c.hop || 0; turn = c.turn || 0; if (c.crouch > .3) pose = 'crouch'; } break; }
    case 'inbound': P = clip('inbound', p.st, { thrown: !holding }); break;
    case 'idle': if (p.clip) { const c = clip(p.clip, p.st); P = c; if (c) { expr = c.expr || null; hop = c.hop || 0; turn = c.turn || 0; } } break;
  }
  if (P && P.crouch > .3 && !pose) pose = 'crouch';
  if (p.landT > 0) { land = p.landK || 1; p.landT = 0; }
  bb.pose = P; bb.w = approach(bb.w, P ? 1 : 0, dt * (P ? 16 : 8));
  const big = S.cheats.bigHeads || (game.settings && game.settings.bigHeads); rig.o.headR = bb.headR * (big ? 1.9 : 1);
  const vx = p.state === 'dunk' || p.state === 'hang' ? 0 : p.vx, vy = p.state === 'dunk' || p.state === 'hang' ? 0 : p.vy;
  rig.update(dt, { x: p.x, y: p.y, z: p.z + hop, vx, vy, facing: p.facing + turn + spin, air, flip, down, hurt, pose, expr, land, run: p.state === 'frozen' ? 0 : undefined });
  if (holding) p.ballAt = ballAnchor(p, P) || [p.x + Math.cos(p.facing) * 6, p.y + Math.sin(p.facing) * 6, p.z + 22];
  else p.ballAt = null;
}
/** where a player's hands are now (world), for catches and blocks */
function handsAt(p) {
  const r = p.rig, J = r.J; if (!J.handR) return [p.x, p.y, p.z + p.shoulderZ()];
  const m = V3.lerp(J.handR, J.handL, .5), w = r.worldOffset(m); return [p.x + w[0], p.y + w[1], p.z + w[2]];
}
/** a player drawn: shadow, the rig (x-ray for humans so they stay findable), Supernova afterimages, the number,
 *  shades, a robot's glow, dizzy stars */
function drawPlayer(r, p) {
  const rig = p.rig, nova = p.isNova();
  r.shadow(p.x, p.y, 7 * Math.max(.5, 1 - p.z / 160), .45);
  const opts = { xray: p.human !== null && p.human !== undefined ? { color: E.PLAYER_COLORS[p.human] || '#8fe3ff' } : false };
  if (nova) opts.ghost = { color: p.overclock > 0 ? '#ff3a3a' : '#ffd23a', life: .18, alpha: .45, owner: p };
  if (p.state === 'frozen') opts.flash = '#8ac8ff';
  if (p.flashT > 0) { opts.flash = '#ffffff'; opts.flashMix = .7; }
  r.actor(p.x, p.y, p.z, (g, ox, oy) => {
    rig.draw(g, ox, oy, r.view);
    const v = r.view, J = rig.J;
    if (J.head && rig.bb.shades) { const w = rig.worldOffset(V3.add(J.head, [rig.o.headR * .85, 0, 0])), x = ox + v.ax * w[0] + v.ay * w[1], y = oy + v.bx * w[0] + v.by * w[1] + v.bz * w[2]; px.rect(g, Math.round(x) - 2, Math.round(y) - 1, 4, 1, '#0a0a10'); }
    if (J.shC && p.state !== 'knock') {   // the jersey number, when the chest or back faces the camera
      const toCam = Math.sin(rig.facing + rig.spin + (rig._cheat || 0)); if (Math.abs(toCam) > .45) {
        const w = rig.worldOffset(V3.add(J.shC, [toCam > 0 ? 1.4 : -1.4, 0, -4])), x = ox + v.ax * w[0] + v.ay * w[1], y = oy + v.bx * w[0] + v.by * w[1] + v.bz * w[2];
        E.font.text(g, String(p.def.number), Math.round(x), Math.round(y) - 2, get('team', p.teamId).colors.trim, { font: 'tiny', align: 'center', outline: false });
      }
    }
  }, opts);
  if (p.dizzy > 0 || p.state === 'stumble') r.queue(p.x, p.y, p.z + 60, g => { const h = rig.head(), [x, y] = r.w(h[0], h[1], h[2] + 7); for (let k = 0; k < 3; k++) { const a = game.time * 7 + k * 2.1; px.dot(g, Math.round(x + Math.cos(a) * 6), Math.round(y + Math.sin(a) * 2), '#ffe040'); px.dot(g, Math.round(x + Math.cos(a) * 6) + 1, Math.round(y + Math.sin(a) * 2), '#fff8b0'); } }, { emissive: true });
}
