// ---- the cast: a rig per player and role (team kit + personal look + role gear), and the cricket animation layer:
// rig.solvePose is wrapped so the bat's two-handed swings, the bowler's overarm windmill and the umpire's signals are
// placed by IK after the engine's own pose (7).
const RIGS = new Map();
const UMP_LOOK = { ump1: { build: 'heroic', size: 1.18, hair: 'short', face: { glasses: true }, colors: { hair: '#d8d8d8', skin: '#f0c8a8', coat: '#f4f4ee', cloth: '#f4f4ee', pants: '#2a2a32', trim: '#1a1a1a' } },
  ump2: { build: 'bulky', size: 1.18, hair: 'bald', face: { moustache: 'walrus' }, colors: { hair: '#8a6a4a', skin: '#e8b090', coat: '#f4f4ee', cloth: '#f4f4ee', pants: '#2a2a32' } } };
function rigFor(p, gear) {
  const key = (p ? p.id : 'x') + ':' + gear;
  if (RIGS.has(key)) return RIGS.get(key);
  let o;
  if (gear === 'ump') { const L = UMP_LOOK[p.id] || UMP_LOOK.ump1; o = Object.assign({ weapon: null, outfit: 'coat', sleeves: 'long', hat: { style: 'cap', color: '#f4f4ee' } }, L, { colors: Object.assign({ boot: '#1a1a1a' }, L.colors) }); }
  else {
    const team = TEAM[p.team], kit = team.kit, L = p.look || {};
    const colors = Object.assign({ cloth: kit.cloth, pants: kit.pants, trim: kit.trim, belt: kit.trim, boot: '#f4f4f0', glove: gear === 'keep' ? '#e8d8a0' : undefined, willow: '#ecd9a0', grip: kit.trim }, L.colors || {});
    if (L.outfit === 'coat' && L.colors && L.colors.coat) colors.coat = L.colors.coat;
    let hat = L.hat || null;
    if (gear === 'bat') hat = (p.id === 'basil' || p.id === 'edie' || p.id === 'thrumpton') ? { style: 'cap', color: kit.cap } : { style: 'helmet', color: kit.cap };
    else if (!hat && gear !== 'keep') hat = L.hair === 'bald' || L.hair === 'short' || p.id.length % 3 === 0 ? { style: 'cap', color: kit.cap } : null;
    if (gear === 'keep' && !hat) hat = { style: 'cap', color: kit.cap };
    const face = Object.assign({}, L.moustache ? { moustache: L.moustache } : {}, L.beard ? { beard: true } : {}, L.glasses ? { glasses: true } : {});
    o = { build: L.build || 'heroic', size: L.size || 1.18, hair: L.hair || 'short', hat, outfit: L.outfit || 'shirt', sleeves: gear === 'bat' || gear === 'keep' ? 'long' : 'short', face,
      weapon: gear === 'bat' ? 'bat' : null, bladeLen: 13.5, pads: gear === 'bat' || gear === 'keep', colors };
    if (L.cape) o.cape = { len: 6, width: 5, seg: 2.5 };
    if (p.ghost) o.eyeGlow = '#a8e0ff';
  }
  const rig = new E.Humanoid(o);
  const solve = rig.solvePose;
  rig.solvePose = function () { solve.call(this); if (this._k) { try { POSE[this._k.kind] && POSE[this._k.kind](this, this._k); } catch (e) { /* a pose that fails leaves the engine's */ } } };
  RIGS.set(key, rig);
  return rig;
}
const V = { add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k], lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; } };
const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
function setArm(rig, side, hand, hint) {
  const J = rig.J, o = rig.o, sh = side > 0 ? J.shR : J.shL;
  const [el, hd] = E.ik3(sh, hand, o.armUpper, o.armLower, hint || [-1, side * .7, -.2]);
  J[side > 0 ? 'elbowR' : 'elbowL'] = el; J[side > 0 ? 'handR' : 'handL'] = hd;
}
// keyframes [u, hands (rel. to the shoulder centre, in the shot frame: a = the shot's direction, b = across, z), bat dir]
const BAT_KEYS = {
  stance: [[0, [2.2, 1.2, -8.6], [.12, .35, -.93]]],
  back: [[0, [.4, 3.2, -1.6], [-.25, .6, .78]]],
  vert: [[0, [.4, 3.2, -1.6], [-.25, .6, .78], 'back'], [1, [2.6, .2, -7.8], [.18, .1, -.98], 'frame'], [1.9, [3.2, -.6, .8], [.55, -.1, .83], 'frame'], [2.8, [2.4, -.4, -.8], [.5, 0, .86], 'frame']],
  loft: [[0, [.2, 3.4, -.8], [-.3, .6, .75], 'back'], [1, [2.6, .2, -7], [.25, .1, -.96], 'frame'], [1.9, [2.6, -1, 3.6], [.4, -.3, .87], 'frame'], [2.8, [1.4, -2.6, 2.4], [-.2, -.6, .78], 'frame']],
  horiz: [[0, [.6, 3.4, -.4], [-.2, .7, .68], 'back'], [1, [3, .6, -3.2], [.15, -.98, -.1], 'frame'], [1.9, [1.2, -3, -1.4], [-.8, -.5, .2], 'frame'], [2.8, [.2, -3.4, 1], [-.6, -.4, .7], 'frame']],
  sweep: [[0, [.6, 3, -2], [-.2, .7, .68], 'back'], [1, [3.4, .6, -8.6], [.2, -.96, -.2], 'frame'], [1.9, [1, -3, -5], [-.8, -.5, .1], 'frame'], [2.8, [0, -3, 0], [-.6, -.4, .7], 'frame']],
  glance: [[0, [.6, 2.6, -2.4], [-.2, .5, .84], 'back'], [1, [2.6, .4, -7.2], [-.3, .2, -.93], 'frame'], [1.9, [2, .6, -4], [-.5, .3, .8], 'frame']],
  block: [[0, [.8, 2.4, -3], [-.1, .5, .86], 'back'], [1, [3.4, .2, -7.2], [.3, .05, -.95], 'frame'], [2.8, [3.4, .2, -7.2], [.3, .05, -.95], 'frame']],
  scoop: [[0, [1, 2, -6], [.2, .3, -.93], 'back'], [1, [3.2, .4, -6], [.6, .1, -.79], 'frame'], [1.9, [1.4, 2.2, 3], [-.6, .3, .74], 'frame']],
  heli: [[0, [.4, 3.2, -1.6], [-.25, .6, .78], 'back'], [1, [2.6, .2, -8], [.18, .1, -.98], 'frame'], [1.5, [2.6, -2, 1], [.2, -.8, .5], 'frame'], [2.1, [.6, 2.4, 3], [-.6, .6, .5], 'frame'], [2.8, [2.6, -1, 3], [.5, -.3, .8], 'frame']]
};
const FAM_KEYS = { drive: 'vert', flick: 'vert', loft: 'loft', pull: 'horiz', cut: 'horiz', sweep: 'sweep', glance: 'glance', block: 'block', scoop: 'scoop', heli: 'heli' };
function batPose(rig, k) {
  const J = rig.J, h = k.h || 1, sC = J.shC;
  // the shot frame in the rig's own frame (x forward = the off side, y right): a points where the ball goes
  const th = k.th || 0, a = [Math.sin(th), -h * Math.cos(th)], b = [-a[1], a[0]];
  const toLocal = (v, frame) => frame ? [v[0] * a[0] + v[1] * b[0], v[0] * a[1] + v[1] * b[1], v[2]] : [v[0], v[1] * h, v[2]];
  let H, D;
  if (k.ph === 'swing') {
    const keys = BAT_KEYS[FAM_KEYS[k.fam] || 'vert'], u = k.t / Math.max(.06, k.at);
    let i = 0; while (i < keys.length - 1 && keys[i + 1][0] < u) i++;
    const A = keys[i], B = keys[Math.min(keys.length - 1, i + 1)], t = B === A ? 0 : ease((u - A[0]) / (B[0] - A[0]));
    const ha = toLocal(A[1], A[3] === 'frame'), hb = toLocal(B[1], B[3] === 'frame'), da = toLocal(A[2], A[3] === 'frame'), db = toLocal(B[2], B[3] === 'frame');
    H = V.lerp(ha, hb, t); D = V.norm(V.lerp(da, db, t));
    if (u > 3.4) { const r = ease((u - 3.4) / 2); H = V.lerp(H, toLocal(BAT_KEYS.stance[0][1]), r); D = V.norm(V.lerp(D, toLocal(BAT_KEYS.stance[0][2]), r)); }
  } else {
    const s = BAT_KEYS.stance[0], bk = BAT_KEYS.back[0], l = ease(k.lift || 0);
    H = V.lerp(toLocal(s[1]), toLocal(bk[1]), l); D = V.norm(V.lerp(toLocal(s[2]), toLocal(bk[2]), l));
    if (!k.lift) { H[2] += Math.sin(rig.t * 5) * .25; }   // tapping the bat
  }
  const hand = V.add(sC, H);
  setArm(rig, 1, hand, [-1, .6, -.4]);
  setArm(rig, -1, V.add(J.handR, V.mul(D, -2.2)), [-1, -.7, -.3]);
  J.bladeDir = D;
}
const POSE = {
  bat: batPose,
  // the bowler's delivery stride: the front arm up, then the bowling arm windmills over the top (the release at the top front)
  bowl(rig, k) {
    const J = rig.J, o = rig.o, t = k.t, R = o.armUpper + o.armLower;
    const u = clamp((t - .02) / .26, 0, 1), al = (210 - 290 * ease(u)) * DEG;
    const hR = V.add(J.shR, [Math.cos(al) * R * .95, .6, Math.sin(al) * R * .95]);
    setArm(rig, 1, hR, [-.3, 1, 0]);
    const ul = clamp(t / .22, 0, 1), al2 = (80 - 140 * ease(ul)) * DEG;
    setArm(rig, -1, V.add(J.shL, [Math.cos(al2) * R * .9, -1.2, Math.sin(al2) * R * .9]), [-.3, -1, 0]);
  },
  // the umpire: hands behind the back; signals: OUT, FOUR, SIX, WIDE, NO BALL, BYE, LEG BYE, NOT OUT, FREE HIT, REVIEW
  signal(rig, k) {
    const J = rig.J, o = rig.o, R = o.armUpper + o.armLower, t = k.t, s = k.s, slow = k.slow || 1;
    const rest = side => V.add(side > 0 ? J.shR : J.shL, [-2.2, side * .2, -R * .75]);
    let hr = rest(1), hl = rest(-1);
    const up = ease(t / (.5 * slow));
    if (s === 'out') hr = V.lerp(hr, V.add(J.shR, [1.5, .4, R * .95]), up);
    if (s === 'six') { hr = V.lerp(hr, V.add(J.shR, [.5, 1.2, R * .95]), up); hl = V.lerp(hl, V.add(J.shL, [.5, -1.2, R * .95]), up); }
    if (s === 'four') { const w = Math.sin(t * 7); hr = V.lerp(hr, V.add(J.shR, [R * .8, -2 + w * 4, -1]), up); }
    if (s === 'wide') { hr = V.lerp(hr, V.add(J.shR, [0, R * .95, 0]), up); hl = V.lerp(hl, V.add(J.shL, [0, -R * .95, 0]), up); }
    if (s === 'noball') hr = V.lerp(hr, V.add(J.shR, [0, R * .95, 0]), up);
    if (s === 'bye') hr = V.lerp(hr, V.add(J.shR, [R * .5, .5, R * .7]), up);
    if (s === 'legbye') { hr = V.lerp(hr, V.add(J.hipR, [3, 1, 1]), up); }
    if (s === 'notout') { hr = V.lerp(hr, V.add(J.shR, [3, -1.5, -4]), up); hl = V.lerp(hl, V.add(J.shL, [3, 1.5, -4]), up); }
    if (s === 'freehit') { const c = t * 8; hr = V.lerp(hr, V.add(J.shR, [Math.cos(c) * 1.5, Math.sin(c) * 1.5, R * .9]), up); }
    if (s === 'review') { const c = clamp((t - .4) / .8, 0, 1); hr = V.lerp(hr, V.add(J.shC, [R * .8, 3 + (c < .5 ? -c * 8 : -4), 2 - (c > .5 ? (c - .5) * 10 : 0)]), up); hl = V.lerp(hl, V.add(J.shC, [R * .8, -3, 2]), up); }
    setArm(rig, 1, hr, [-1, .7, -.2]); setArm(rig, -1, hl, [-1, -.7, -.2]);
  },
  // fielder catching: hands cupped in front, at a height
  cup(rig, k) { const J = rig.J, z = k.z || 0; setArm(rig, 1, V.add(J.shC, [5.5, 1.2, z]), [-1, .7, -.3]); setArm(rig, -1, V.add(J.shC, [5.5, -1.2, z]), [-1, -.7, -.3]); },
  keep(rig, k) { const J = rig.J; setArm(rig, 1, V.add(J.shC, [4.2, 1.6, -5]), [-1, .7, -.3]); setArm(rig, -1, V.add(J.shC, [4.2, -1.6, -5]), [-1, -.7, -.3]); }
};
// what each actor's rig is told this step (rig.update's state and the post-pose)
function rigState(a, m) {
  const st = { x: a.x + OX, y: a.y + OY, z: a.z || 0, vx: a.vx || 0, vy: a.vy || 0, facing: a.facing };
  let k = null;
  const an = a.anim, t = a.animT || 0;
  if (a.role === 'bat') {
    const h = (a.p && a.p.hand) || 1;
    if (an === 'stance' || an === 'stanceIdle') { let lift = 0; if (m && (m.state === 'flight' || (m.state === 'runup' && m.st > m.runupDur - .5))) lift = m.state === 'flight' ? 1 : (m.st - (m.runupDur - .5)) / .5; k = { kind: 'bat', ph: 'stance', lift, h }; st.vx = st.vy = 0; st.facing = h > 0 ? Math.PI : 0; }
    else if (an === 'swing' && a.sw) { k = { kind: 'bat', ph: 'swing', t, fam: a.sw.fam, at: a.sw.at, th: a.sw.th, h }; st.vx = st.vy = 0; st.facing = h > 0 ? Math.PI : 0; }
    else if (an === 'charge') { st.vy = 90; st.facing = Math.PI / 2 + (h > 0 ? .9 : -.9); }
    else if (an === 'dive') { st.down = .55; }
    else if (an === 'celebrate') { st.pose = 'cheer'; st.expr = 'smile'; }
    else if (an === 'dejected') { st.pose = t < 1.2 ? 'kneel' : null; st.hunch = true; if (t > 1.2) { st.vx = 30; st.facing = 0; } }
    else if (an === 'backup' || an === 'backupIdle') { st.facing = -Math.PI / 2; }
  } else if (a.role === 'bowler' || a.role === 'field' || a.role === 'keeper') {
    if (an === 'deliver') { k = { kind: 'bowl', t }; st.hop = t < .14 ? Math.sin(t / .14 * Math.PI) * 3 : 0; if (t > .3) st.pose = null; }
    else if (an === 'runup') { st.vx = 0; st.vy = a.vy || -200; st.facing = -Math.PI / 2; }
    else if (an === 'appeal' || an === 'appealWin' || an === 'cheer') { st.pose = 'cheer'; st.expr = 'shout'; }
    else if (an === 'throw') st.attack = E.move('throw', clamp(t / .42, 0, 1));
    else if (an === 'dive' || an === 'diveCatch') { st.down = t < .5 ? .6 : Math.max(0, .6 - (t - .5) * 2); if (an === 'diveCatch' && t > .7) st.pose = 'cheer'; }
    else if (an === 'catch') { if (t < .5) k = { kind: 'cup', z: 2 }; else st.pose = 'cheer'; }
    else if (an === 'gather') { st.pose = 'crouch'; k = { kind: 'cup', z: -6 }; }
    else if (an === 'drop') { st.pose = 'crouch'; st.expr = 'wince'; }
    else if (an === 'walkin') { st.crouch = true; st.vx = -Math.cos(a.facing) * 6; st.vy = -Math.sin(a.facing) * 6; st.vx = Math.cos(a.facing) * 8; st.vy = Math.sin(a.facing) * 8; }
    else if (an === 'keep') { st.pose = 'crouch'; k = { kind: 'keep' }; }
    else if (an === 'stump') { k = { kind: 'cup', z: -4 }; }
  } else if (a.role === 'ump') {
    k = { kind: 'signal', s: a.signal, t, slow: a.p && a.p.id === 'ump1' ? 1.6 : 1 };
  }
  if (a.expr && !st.expr) st.expr = a.expr;
  return { st, k };
}
function poseRig(rig, a, m, dt) { const { st, k } = rigState(a, m); rig._k = k; rig.update(dt, st); return rig; }
function gearOf(a) { return a.role === 'bat' ? 'bat' : a.role === 'keeper' ? 'keep' : a.role === 'ump' ? 'ump' : 'field'; }
