/* RIGS: every athlete is an HD Humanoid in his team's uniform, with football gear drawn by the gear hook (engine change
 * E3): shoulder pads, the jersey number front and back, the carried ball, eye black; refs' stripes, coaches' headsets,
 * cheerleaders' pom-poms and mascots' costume heads. Pose codes from the sim become animation from four sources: the
 * procedural rig, E.MOVES, the FIASCO motion clips (mocap), and PoseFX (joint post-processing: tilt, roll, lift). */
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E, Y = 16;
const LIB = (typeof Mocap !== 'undefined' && window.MOCAP && window.MOCAP.FIASCO) ? Mocap.load(window.MOCAP.FIASCO) : null;
const CLIP = n => LIB && LIB.clip(n);
const SIZE = { OL: 1.42, NT: 1.46, DE: 1.38, LB: 1.3, RB: 1.24, WR: 1.2, CB: 1.2, S: 1.22, QB: 1.25, K: 1.04 };
const BUILD = { OL: 'bulky', NT: 'bulky', DE: 'bulky', LB: 'bulky' };

/** the gear hook: depth-sorted football gear inside the rig */
function gear(opt) {
  return api => {
    const { g, Sp, Q, J, C, u, push, rig, view } = api;
    const o = rig.o;
    if (opt.pads) {
      const t = E.tones(opt.jersey);
      for (const s of ['L', 'R']) { const P = Q['sh' + s], k = Math.max(1.5, u * 2.6 * (opt.big ? 1.15 : 1)); push(P[2] + .01, () => { px.disc(g, P[0], P[1] - u * .6, k, t.sh); px.disc(g, P[0] - .5, P[1] - u * .6 - .5, Math.max(1, k - 1), t.base); px.dot(g, P[0] - k * .4, P[1] - u * .6 - k * .5, t.lt); }); }
    }
    // the jersey number: on the chest when the torso faces the camera, on the back when it faces away
    if (opt.num !== undefined) {
      const an = rig.facing + (rig.spin || 0), d = Math.cos(an) * (view.fx || 0) + Math.sin(an) * (view.fy || 0);
      if (Math.abs(d) > .3) {
        const P = api.lq(Q.shC, Q.hipC, .38);
        push(P[2] + (d > 0 ? .02 : -.02) + .05, () => E.font.text(g, String(opt.num), Math.round(P[0]), Math.round(P[1] - 2), opt.numColor, { font: 'tiny', align: 'center', outline: false }));
      }
    }
    if (opt.stripes) { const a = Q.shC, b = Q.hipC; push((a[2] + b[2]) / 2 + .04, () => { for (const k of [-2, 0, 2]) px.line(g, a[0] + k * u * .8, a[1] + 1, b[0] + k * u * .8, b[1] - 1, '#141418'); }); }
    if (opt.headset) { const h = Sp(J.head, 0, -o.headR * 1.05, o.headR * .2); push(Q.head[2] + .05, () => { px.disc(g, h[0], h[1], Math.max(1, u * 1.1), '#2a2a30'); const m = Sp(J.head, o.headR * .9, -o.headR * .6, -o.headR * .5); px.line(g, h[0], h[1], m[0], m[1], '#2a2a30'); }); }
    if (opt.whistle) { const w = api.lq(Q.shC, Q.hipC, .15); push(w[2] + .06, () => px.dot(g, w[0], w[1], '#e0e0e0')); }
    if (opt.apron) { const a = api.lq(Q.shC, Q.hipC, .3), b = Q.hipC; push(a[2] + .03, () => { px.rect(g, Math.round(a[0]) - 3, Math.round(a[1]), 6, Math.max(3, Math.round(b[1] - a[1]) + 2), '#f4f0e0'); px.rect(g, Math.round(a[0]) - 1, Math.round(a[1]) + 2, 2, 2, '#4a9a3a'); }); }
    if (opt.poms) for (const s of ['L', 'R']) { const H = Q['hand' + s]; push(H[2] + .03, () => { px.disc(g, H[0], H[1], Math.max(2, u * 2.2), opt.poms[0]); px.dot(g, H[0] - 1, H[1] - 1, opt.poms[1]); }); }
    if (opt.mascot) mascotHead(api, opt.mascot);
    if (opt.beard) { const b = Sp(J.head, o.headR * .7, 0, -o.headR * .6); push(Q.head[2] + .04, () => { px.disc(g, b[0], b[1], Math.max(2, u * o.headR * .55), opt.beard); }); }
    // the carried ball, at the carrying hand
    if (rig.carry) {
      const H = rig.carry === 'L' ? Q.handL : Q.handR;
      push(H[2] + .025, () => drawBall(g, H[0], H[1] - 1, rig.facing, false, Math.max(1, u * .9), rig.fire));
    }
    if (rig.dingT > 0) { const t = FF.game.time * 6; for (let k = 0; k < 3; k++) { const a = t + k * 2.09, p = Sp(J.head, Math.cos(a) * o.headR * 1.6, Math.sin(a) * o.headR * 1.6, o.headR * 1.4); push(Q.head[2] + .1, () => { px.glow(g, 1); px.dot(g, p[0], p[1], '#fff6a0'); }); } }
    void C;
  };
}
function mascotHead(api, m) {
  const { g, Sp, J, Q, u, push, rig } = api, R = rig.o.headR, c = Sp(J.head, 0, 0, R * .6), r = R * u * 2.1, k = m.head;
  push(Q.head[2] + .2, () => {
    const t = E.tones(m.color);
    if (k === 'tumbleweed') { px.disc(g, c[0], c[1], r, '#6a4a22'); for (let i = 0; i < 9; i++) { const a = i * 1.3 + FF.game.time * .5, b = i * 2.1; px.line(g, c[0] + Math.cos(a) * r * .9, c[1] + Math.sin(a) * r * .9, c[0] + Math.cos(b) * r * .8, c[1] + Math.sin(b) * r * .8, '#a07a40'); } }
    else { px.disc(g, c[0], c[1], r, t.sh); px.disc(g, c[0] - .7, c[1] - .7, r - 1, t.base); }
    if (k === 'hog') { px.disc(g, c[0], c[1] + r * .3, r * .35, '#e07080'); px.dot(g, c[0] - 1, c[1] + r * .3, '#5a2a30'); px.dot(g, c[0] + 1, c[1] + r * .3, '#5a2a30'); px.poly(g, [[c[0] - r, c[1] - r * .4], [c[0] - r * .6, c[1] - r * 1.1], [c[0] - r * .3, c[1] - r * .6]], t.sh); px.poly(g, [[c[0] + r, c[1] - r * .4], [c[0] + r * .6, c[1] - r * 1.1], [c[0] + r * .3, c[1] - r * .6]], t.sh); }
    if (k === 'owl') { px.glow(g, 1); px.disc(g, c[0] - r * .4, c[1] - r * .1, r * .32, '#3af0f0'); px.disc(g, c[0] + r * .4, c[1] - r * .1, r * .32, '#3af0f0'); px.glow(g, 0); px.poly(g, [[c[0] - 1, c[1] + r * .2], [c[0] + 1, c[1] + r * .2], [c[0], c[1] + r * .5]], '#ffd84a'); }
    if (k === 'yeti') { for (const s of [-1, 1]) px.line(g, c[0] + s * r * .6, c[1] - r * .7, c[0] + s * r * .9, c[1] - r * 1.3, '#c8c0a0', 2); }
    if (k === 'lion') { for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; px.disc(g, c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, r * .3, '#c88a20'); } px.disc(g, c[0], c[1], r * .8, m.color); }
    // googly eyes for all but the owl
    if (k !== 'owl') for (const s of [-1, 1]) { px.disc(g, c[0] + s * r * .38, c[1] - r * .2, Math.max(1.5, r * .26), '#ffffff'); px.dot(g, c[0] + s * r * .38 + Math.sin(FF.game.time * 7 + s) , c[1] - r * .2, '#101010'); }
  });
}
/** the football: a brown prolate ellipse with laces and tip bands, its long axis along a, a spiral when spinning */
function drawBall(g, x, y, a, spin, s = 1, fire) {
  const ca = Math.cos(a), sa = Math.sin(a) * .55, L = 3.6 * s, W = 2.1 * s, pts = [];
  for (let i = 0; i < 10; i++) { const t = i / 10 * 6.283, ex = Math.cos(t) * L, ey = Math.sin(t) * W; pts.push([x + ex * ca - ey * sa * 1.6, y + ex * sa + ey * ca]); }
  if (fire) { px.glow(g, 1); px.disc(g, x - ca * 3, y - sa * 3, 3 * s, '#ff8a2a'); px.glow(g, 0); }
  px.poly(g, pts, '#5a2a12'); px.disc(g, x - .4, y - .4, Math.max(1, W - .6), '#8a4a22'); px.dot(g, x - ca * L * .4 - .5, y - sa * L * .4 - 1, '#c07a4a');
  const lace = spin ? (Math.floor(FF.game.time * 30) % 2 ? 1 : -1) : -1;
  px.line(g, x - ca * L * .35, y - sa * L * .35 + lace * .6, x + ca * L * .35, y + sa * L * .35 + lace * .6, '#f4f0e0');
}
FF.drawBall = drawBall;

const RIGS = new Map();
const R = FF.Rigs = {
  LIB,
  /** the rig of an athlete (made on first use) */
  of(a) { let r = RIGS.get(a); if (!r) { r = makeAthleteRig(a); RIGS.set(a, r); } return r; },
  clear() { RIGS.clear(); },
  athleteLook(p, team, away) {
    const c = team.colors, jersey = away ? '#f4f4f0' : c.primary, trim = away ? c.primary : c.trim;
    return { jersey, trim, numColor: away ? c.primary : (E.tones(c.primary).base && luminance(c.primary) > .55 ? c.secondary : c.trim) };
  },
  /** a cast rig from a spec { build, skin, hair, hairColor, cloth, coat, cap, headset, whistle, apron, ref } */
  cast(spec, size = 1.2) {
    const o = { size, build: spec.build || 'heroic', weapon: null, outfit: spec.coat ? 'coat' : 'shirt', sleeves: spec.coat ? 'long' : 'short', hair: spec.hair || 'short',
      colors: { skin: FF.SKIN[(spec.skin || 2) - 1], hair: spec.hairColor || '#3a2a1a', cloth: spec.cloth || '#4a4a5a', coat: spec.coat || spec.cloth, pants: spec.ref ? '#18181c' : '#2a2a34', boot: '#1a1a1e', belt: '#1a1a1e', trim: spec.cloth } };
    if (spec.cap) o.hat = { style: 'cap', color: spec.cap };
    const r = new E.Humanoid(Object.assign(o, { gear: gear({ headset: spec.headset, whistle: spec.whistle, apron: spec.apron, stripes: spec.ref }) }));
    rigFx(r); return r;
  },
  /** the rig for a story character id (FF.data.cast) */
  castRig(id) {
    const c = FF.data.cast[id]; if (!c) return null;
    if (c.rig) return R.cast(c.rig);
    if (c.team) { const t = FF.team(c.team), p = t.roster.find(x => x.slot === c.slot); return makeRig(p, t, false, { helmetOff: true }); }
    if (c.mascot) return R.mascot(FF.team(c.mascot));
    return null;
  },
  mascot(team) { const m = team.mascot, r = new E.Humanoid({ size: 1.3, build: 'bulky', weapon: null, hair: 'bald', colors: { skin: m.body, cloth: m.body, pants: m.body, boot: '#2a2a2a', belt: team.colors.secondary, trim: team.colors.trim }, gear: gear({ mascot: { head: m.head, color: m.body } }) }); rigFx(r); return r; },
  cheerleader(team, k) { const c = team.colors, r = new E.Humanoid({ size: 1.08, build: 'heroic', weapon: null, hair: 'ponytail', outfit: 'tunic', sleeves: 'none', colors: { skin: FF.SKIN[k % 6], hair: ['#e0c060', '#3a2a1a', '#c05a2a', '#1a1410'][k % 4], cloth: c.primary, pants: c.trim, boot: '#f4f4f0', trim: c.trim }, gear: gear({ poms: [c.secondary, c.trim] }) }); rigFx(r); return r; },
  ref() { return R.cast(FF.data.cast.ref.rig, 1.15); },
  /** drive a rig from an athlete's pose code (Appendix C) */
  drive(a, dt, o = {}) {
    const rig = R.of(a); drivePose(rig, a, dt, o); return rig;
  },
  driveRig: (rig, a, dt, o = {}) => drivePose(rig, a, dt, o)
};
function luminance(h) { const v = E.hex(h); return (v[0] * .3 + v[1] * .59 + v[2] * .11) / 255; }
function makeAthleteRig(a) { const team = FF.sim.teams[a.team]; return makeRig(a.p, team, a.team === 1); }
function makeRig(p, team, away, o = {}) {
  const look = R.athleteLook(p, team, away), c = team.colors, pos = p.pos;
  const size = p.boss || SIZE[pos] || 1.2, build = BUILD[pos] || 'heroic';
  const hat = o.helmetOff ? null : { style: 'football', color: c.helmet, stripe: c.stripe, logo: c.secondary, mask: '#a0a4ac' };
  const ro = { size, build, weapon: null, outfit: 'shirt', sleeves: 'short', hair: p.hair, hat,
    colors: { skin: FF.SKIN[(p.skin || 2) - 1], hair: p.hairColor, cloth: look.jersey, trim: look.trim, pants: c.pants, boot: c.cleats, belt: c.secondary, glove: away ? c.primary : c.secondary },
    gear: gear({ pads: true, big: build === 'bulky', jersey: look.jersey, num: p.num, numColor: look.numColor, beard: p.special === 'snowplow' ? '#f0f0f0' : null }) };
  if (pos === 'RB') ro.limbW = 2.35;
  const rig = new E.Humanoid(ro);
  rig.hatSpec = hat; rigFx(rig);
  if (LIB) Mocap.drive(rig, LIB);
  rigFx(rig);
  return rig;
}
/** PoseFX: wrap solvePose to tilt, roll and lift the whole body after the rig (and its clip) posed it */
function rigFx(rig) {
  if (rig._fxWrapped && rig._fxWrapped === rig.solvePose) return;
  const base = rig.solvePose;
  rig.fx = rig.fx || { tilt: 0, roll: 0, lift: 0 };
  rig.solvePose = function () {
    base.call(this);
    const f = this.fx; if (!f || (!f.tilt && !f.roll && !f.lift)) return;
    const J = this.J, c = J.hipC.slice(), ct = Math.cos(f.tilt), st = Math.sin(f.tilt), cr = Math.cos(f.roll), sr = Math.sin(f.roll);
    let lo = 1e9;
    for (const k of ['hipL', 'hipR', 'kneeL', 'kneeR', 'footL', 'footR', 'hipC', 'shC', 'shL', 'shR', 'head', 'elbowL', 'elbowR', 'handL', 'handR']) {
      const p = J[k]; if (!p) continue;
      let x = p[0] - c[0], y = p[1] - c[1], z = p[2] - c[2];
      const x1 = x * ct + z * st, z1 = -x * st + z * ct; x = x1; z = z1;        // tilt about the right axis (+ = forward)
      const y2 = y * cr - z * sr, z2 = y * sr + z * cr; y = y2; z = z2;           // roll about the forward axis
      p[0] = c[0] + x; p[1] = c[1] + y; p[2] = c[2] + z + f.lift;
      lo = Math.min(lo, p[2]);
    }
    if (lo < 0 && f.ground !== false) for (const k in J) if (J[k] && J[k].length === 3) J[k][2] -= lo;
  };
  rig._fxWrapped = rig.solvePose;
}
const phaseOf = u => u < .3 ? ['wind', u / .3] : u < .62 ? ['active', (u - .3) / .32] : ['recover', (u - .62) / .38];
const mv = (name, u) => { const [ph, k] = phaseOf(u); return E.move(name, k, ph); };
const lerp = (a, b, k) => a + (b - a) * k;
const DANCE = { charleston: 'Dance Charleston', bodyroll: 'Dance Body Roll', helicopter: 'Breakdance_Helicopter', backflip: 'Backflip', fistpump: 'Victory Fist Pump', huddle: 'Dance_Loop' };

function drivePose(rig, a, dt, o) {
  const b = a.b || a, pose = a.pose, u = a.poseU || 0, fx = rig.fx;
  const st = { x: b.x, y: b.y, z: b.z || 0, vx: b.vx || 0, vy: b.vy || 0, facing: a.facing || 0 };
  let clip = null, ct = 0, mask = null, w = 0;
  let tilt = 0, roll = 0, lift = 0;
  rig.mtime = (rig.mtime || 0) + dt;
  if (rig.lastPose !== pose) { rig.lastPose = pose; rig.mtime = 0; }
  const t = rig.mtime;
  switch (pose) {
    case 'RUN': case 'IDLE': st.sprint = a.intent && a.intent.turbo; break;
    case 'CARRY': st.sprint = a.intent && a.intent.turbo; break;
    case 'STANCE3': clip = CLIP('Land_Three_Point'); ct = 9; w = 1; st.vx = st.vy = 0; break;
    case 'STANCE2': st.pose = 'crouch'; st.vx = st.vy = 0; break;
    case 'QB_UC': st.pose = 'crouch'; st.vx = st.vy = 0; break;
    case 'QB_SG': st.vx = st.vy = 0; st.pose = 'guard'; break;
    case 'SNAP': st.pose = 'crouch'; st.attack = mv('thrust', u); break;
    case 'THROW': clip = CLIP('OverhandThrow'); ct = (clip ? clip.dur : 1) * Math.min(1, u * 1.1); w = 1; mask = Math.hypot(st.vx, st.vy) > 30 ? 'upper' : null; break;
    case 'HANDOFF_GIVE': st.attack = mv('thrust', u); break;
    case 'HANDOFF_TAKE': st.pose = 'guard'; break;
    case 'LATERAL': st.attack = mv('throw', u); break;
    case 'CATCH_READY': st.pose = 'cast'; break;
    case 'JUMP': st.air = true; st.pose = 'cheer'; break;
    case 'DIVE': case 'TACKLE_DIVE': case 'DIVE_CATCH': tilt = Math.min(1, u * 4) * 1.25; st.air = u < .45; st.attack = mv(pose === 'DIVE' ? 'jab' : 'thrust', Math.min(1, u * 1.5)); if (u > .45) { tilt = 1.45; lift = -2; } break;
    case 'BIGHIT': st.attack = mv('bash', u); tilt = .45 * Math.sin(Math.min(1, u * 1.5) * Math.PI); st.expr = 'shout'; break;
    case 'SPIN': st.facing = (a.facing || 0) + 6.283 * E.ease.inOutQuad(Math.min(1, u)); break;
    case 'STIFFARM': st.attack = E.move('jab', Math.min(1, u * 2), u < .7 ? 'active' : 'recover'); break;
    case 'HURDLE': clip = CLIP('Run_Jump_Over'); ct = (clip ? clip.dur : 1) * u; w = 1; st.air = true; break;
    case 'BLOCK': clip = CLIP('Push_Loop'); ct = t; w = 1; mask = 'upper'; break;
    case 'STRIP': st.attack = mv('hook', u); break;
    case 'KICK': st.attack = mv('kick', u); break;
    case 'HOLD': st.pose = 'kneel'; st.vx = st.vy = 0; break;
    case 'TACKLED': clip = CLIP(a.tackledFrom === 'behind' ? 'Fall_On_Face' : 'Hit_Knockback'); ct = Math.min(clip ? clip.dur : 1, t * 1.3); w = 1; if (t > .9) { clip = null; st.down = 1; } break;
    case 'FLY': tilt = -1.2; roll = a.fly && a.fly.mega ? t * 12 : 0; st.air = true; st.expr = 'wince'; fx.ground = false; break;
    case 'DOWN': st.down = 1; break;
    case 'PILE': st.down = 1; tilt = Math.sin(a.id * 1.7) * .4; roll = Math.cos(a.id * 2.3) * .3; lift = (a.id % 3) * 3; break;
    case 'GETUP': clip = CLIP('Get_Up_Face_Down'); ct = (clip ? clip.dur : 1) * Math.min(1, u); w = 1; break;
    case 'CELEBRATE': {
      const d = a.dance || 'fistpump';
      if (d === 'spike') { st.attack = mv('throw', Math.min(1, t / .8)); if (t > .8) st.pose = 'cheer'; }
      else { clip = CLIP(DANCE[d] || 'Victory Fist Pump'); ct = t; w = 1; }
      st.vx = st.vy = 0; st.expr = 'shout'; break; }
    case 'CHEER': clip = CLIP('Cheering_Two_Hands'); ct = t + (a.id || 0) * .37; w = 1; st.expr = 'smile'; break;
    case 'DEJECTED': st.pose = 'kneel'; st.vx = st.vy = 0; st.expr = 'wince'; break;
    case 'KNEEL': st.pose = 'kneel'; break;
    case 'SEISMIC': st.air = true; st.attack = mv('bash', u); st.expr = 'shout'; break;
    case 'MUDSLIDE': st.attack = mv('bash', Math.min(1, u * 1.6)); tilt = .5; st.expr = 'shout'; break;
    case 'REF_TD': st.pose = 'cheer'; st.vx = st.vy = 0; break;
    case 'REF_FD': st.attack = E.move('jab', .7, 'active'); break;
    case 'REF_INC': st.attack = mv('slash', (t * 2) % 1); break;
    case 'REF_SHRUG': st.pose = 'hips'; break;
    case 'CHEERLEADER': clip = CLIP(Math.floor(t / 4) % 2 ? 'Jumping Jacks' : 'Cheering_Two_Hands'); ct = t; w = 1; break;
    case 'COACH_YELL': st.pose = 'hips'; st.expr = 'shout'; break;
    case 'DANCE': clip = CLIP('Dance_Loop'); ct = t; w = 1; break;
    case 'BACKFLIP': clip = CLIP('Backflip'); ct = t % 1.6; w = 1; break;
  }
  if (a.hot > 0 && !st.expr) st.expr = 'smile';
  // blend the clip in and out over 0.1 s, never snapping
  if (LIB && rig.mocap !== undefined || LIB) {
    const target = clip ? w : 0;
    rig.mocapW = rig.mocapW === undefined ? target : rig.mocapW + Math.sign(target - rig.mocapW) * Math.min(Math.abs(target - rig.mocapW), dt * 10);
    if (clip) { rig.mocap = LIB.sample(clip, ct); rig._lastClip = clip; rig.mocapMask = mask; }
    else if (rig.mocapW <= 0) rig.mocap = null;
    else if (rig._lastClip) rig.mocap = LIB.sample(rig._lastClip, ct);
  }
  if (pose !== 'FLY') fx.ground = true;
  fx.tilt = lerp(fx.tilt, tilt, Math.min(1, dt * 14)); fx.roll = pose === 'FLY' ? roll : lerp(fx.roll, roll, Math.min(1, dt * 14)); fx.lift = lerp(fx.lift, lift, Math.min(1, dt * 10));
  rig.carry = o.carry ? 'R' : null; rig.fire = !!o.fire; rig.dingT = a.dinged || 0;
  // the helmet comes off on a big hit (it is picked up at the next snap)
  if (rig.hatSpec) rig.o.hat = a.helmetOff ? null : rig.hatSpec;
  const bigHeads = FF.game.settings.bigHeads || (FF.sim.cheats && FF.sim.cheats.bigHeads);
  if (rig.baseHead === undefined) rig.baseHead = rig.o.headR;
  const want = rig.baseHead * (bigHeads ? 1.9 : 1); if (rig.o.headR !== want) rig.o.headR = want;
  rig.update(dt, st);
}
})();
