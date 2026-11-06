// Rigs: real mocap on Humanoids, a hand-posed layer for moves with no clip, a wobble about the feet; Tare, Gerald, the cast.
G.lib = Mocap.load(window.MOCAP.FITCLIPS);
const V3 = E.V3, add = V3.add;
function setBody(rig, b) {
  const o = rig.o, J = rig.J, hipC = b.hip;
  J.hipC = hipC; J.hipL = add(hipC, [0, -o.hipHalf, 0]); J.hipR = add(hipC, [0, o.hipHalf, 0]);
  for (const s of [-1, 1]) { const hip = s > 0 ? J.hipR : J.hipL, foot = s > 0 ? b.footR : b.footL,
      [kn, f2] = E.ik3(hip, foot, o.legUpper, o.legLower, b.knee ? b.knee(s) : [1, s * .3, .1]);
    J[s > 0 ? 'kneeR' : 'kneeL'] = kn; J[s > 0 ? 'footR' : 'footL'] = f2; }
  const dir = V3.norm(b.chest || [0, 0, 1]), shC = add(hipC, V3.mul(dir, o.torso)); J.shC = shC;
  J.shL = add(shC, [0, -o.shoulderHalf, 0]); J.shR = add(shC, [0, o.shoulderHalf, 0]);
  J.head = add(shC, V3.mul(V3.norm([dir[0], dir[1], dir[2] + .4]), o.neck + o.headR));
  for (const s of [-1, 1]) { const sh = s > 0 ? J.shR : J.shL, hand = s > 0 ? b.handR(shC, sh) : b.handL(shC, sh),
      [el, h2] = E.ik3(sh, hand, o.armUpper, o.armLower, [-1, s * .7, -.2]);
    J[s > 0 ? 'elbowR' : 'elbowL'] = el; J[s > 0 ? 'handR' : 'handL'] = h2; }
}
G.moves = {
  sideLunge: u => rig => { const o = rig.o, a = Math.abs(u), w = o.footSpread + 5.4;
    return { hip: [0, u * 3.8, o.hipZ - a * o.hipZ * .4], footL: [.5, -w, 0], footR: [.5, w, 0], knee: s => [1, s * .7, .1],
      chest: [.28 * a, -u * .1, 1], handL: c => add(c, [4, -.6, -2.6]), handR: c => add(c, [4, .6, -2.6]) }; },
  hula: ph => rig => { const o = rig.o, hx = Math.cos(ph) * 2.1, hy = Math.sin(ph) * 2.1;
    return { hip: [hx, hy, o.hipZ - .5], footL: [.3, -o.footSpread - 1, 0], footR: [.3, o.footSpread + 1, 0], chest: [-hx * .22, -hy * .22, 1],
      handL: (c, sh) => add(sh, [.4, -6, 1.6 + Math.sin(ph) * .6]), handR: (c, sh) => add(sh, [.4, 6, 1.6 - Math.sin(ph) * .6]) }; },
  stepUp: (k, zb = 5) => rig => { const o = rig.o;
    return { hip: [.2 + k * 1.2, k * 1.6, o.hipZ + k * zb * .7], footL: [k > .5 ? 3 : -1, -o.footSpread, k > .85 ? zb : 0], footR: [3, o.footSpread, zb * Math.min(1, k * 2)],
      chest: [.1, 0, 1], handL: (c, sh) => add(sh, [1 + k * 3, -1.2, -3 + k * 2]), handR: (c, sh) => add(sh, [3 - k * 3, 1.2, -1 - k * 2]) }; },
};
G.makeRig = opts => {
  const rig = new E.Humanoid(Object.assign({ weapon: null }, opts));
  Mocap.drive(rig, G.lib);
  const base = rig.solvePose;
  rig.wob = [0, 0]; rig.body = null;
  rig.solvePose = function () {
    base.call(this);
    if (this.body) { const b = this.body(this); if (b) setBody(this, b); }
    const ax = this.wob[0], ay = this.wob[1]; if (!ax && !ay) return;
    const J = this.J, a = ax * .45, b = ay * .3, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    for (const k in J) { if (k === 'bladeDir' || !J[k]) continue; const p = J[k];
      const r2 = p[1] * ca + p[2] * sa, z2 = -p[1] * sa + p[2] * ca, f2 = p[0] * cb + z2 * sb, z3 = -p[0] * sb + z2 * cb;
      p[0] = f2; p[1] = r2; p[2] = Math.max(z3, 0); }
  };
  return rig;
};
// poses: the table of clips and windows lives in game/data/poses.js
G.clip = n => G.lib.clip(n);
G.poseT = (name, time) => { const P = G.POSES[name], a = P.a, b = P.b; return a + (b - a) * .3 * (.5 + .5 * Math.sin(time * .7)); };
G.samplePose = (name, time, out) => { const P = G.POSES[name]; return G.lib.sample(G.clip(P.clip), G.poseT(name, time), out); };
G.loopT = (clip, t) => { const c = G.clip(clip); return c.dur > 0 ? t % c.dur : 0; };
G.sampleLoop = (clip, t) => G.lib.sample(G.clip(clip), G.loopT(clip, t));
// drive a rig for one step. tgt: facing; a clip turns the rig by its own heading, so aim with tgt minus that turn
G.place = (rig, dt, x, y, z, tgt, extra) => {
  rig.update(dt, Object.assign({ x, y, z: z || 0, vx: 0, vy: 0, facing: tgt - (rig.spin || 0) }, extra || {}));
  rig.px = x; rig.py = y; rig.pz = z || 0;
};

const WOOD = { birch: ['#d9b68a', '#b8905f', '#7c5a35'], alder: ['#ecd3ac', '#d0ae80', '#94744a'] };
G.instructorRig = (who, size = 2.1) => {
  const w = WOOD[who], c = w[0], s = w[1];
  const rig = G.makeRig({ size, build: 'heroic', limbW: 1.5, torsoW: 2.5, hair: who === 'alder' ? 'ponytail' : 'bald', sleeves: 'none', outfit: 'shirt',
    colors: { skin: c, hair: s, cloth: c, coat: c, pants: s, boot: s, belt: s, trim: s, glove: c, eye: '#5a3a1a', iris: '#5a3a1a' } });
  rig.wood = w; return rig;
};
G.lookToRig = (look, size = 2.1, wear = {}) => {
  const SK = G.LOOKS.skins, TO = G.LOOKS.tops, BO = G.LOOKS.bottoms;
  const o = { size, build: 'chibi', hair: look.hair, outfit: 'shirt', sleeves: 'short',
    colors: { skin: SK[look.skin], hair: look.hairColor || '#4a3428', cloth: TO[look.top], coat: TO[look.top], pants: BO[look.bottom], boot: '#f4f4f0', belt: BO[look.bottom], trim: '#ffffff', glove: SK[look.skin], eye: '#20202a' } };
  if (wear.headband) o.hat = { style: 'band', color: '#2cc6e6' };
  const rig = G.makeRig(o); rig.wear = wear; rig.look = look; return rig;
};
G.memberRig = (size = 2.1) => { const st = G.state; return G.lookToRig(st.look, size, G.wearOf(st)); };
G.wearOf = st => { const w = {}; for (const u of G.unlockedItems(st)) w[u.id] = !(st.wear && st.wear[u.id] === false); return w; };
G.regularRig = (id, size = 1.9) => { const R = G.CAST[id]; return G.makeRig(Object.assign({ size, build: 'chibi', sleeves: 'short', outfit: 'shirt' }, R.rig, { colors: Object.assign({ boot: '#e8e8e8' }, R.rig.colors) })); };

// after rig.draw, in the same r.actor: mannequin ball joints, and what the member has unlocked
const JOINTS = ['kneeL', 'kneeR', 'elbowL', 'elbowR', 'shL', 'shR'];
G.drawExtras = (g, rig, ox, oy, r) => {
  const v = rig.lastView || r.view;
  if (rig.wood) for (const k of JOINTS) { if (!rig.J || !rig.J[k]) continue; const w = rig.worldOffset(rig.J[k]), p = v.p(w[0], w[1], w[2]);
    const R = rig.o.size >= 1.8 ? 3 : 2; px.disc(g, ox + p[0], oy + p[1], R, rig.wood[2]); px.disc(g, ox + p[0], oy + p[1], R - 1, rig.wood[1]); }
  if (rig.wear && rig.J && rig.J.head) {
    const hw = rig.worldOffset(rig.J.head), hp = v.p(hw[0], hw[1], hw[2]), hx = ox + hp[0], hy = oy + hp[1], R = Math.round(rig.o.headR * (rig.o.size || 1) * 1.5);
    if (rig.wear.sunhat || rig.wear.spareHat) { const c = rig.wear.spareHat ? '#c7a7e8' : '#f3dfa0', d = rig.wear.spareHat ? '#a584cc' : '#d8bf78';
      px.ell(g, hx, hy - R * .75, R * 1.9, Math.max(2, R * .45), d); px.ell(g, hx, hy - R * .85, R * 1.8, Math.max(2, R * .38), c); px.disc(g, hx, hy - R * 1.1, R * .8, c); }
    if (rig.wear.towel && rig.J.shC) { const s = rig.worldOffset(rig.J.shC), p = v.p(s[0], s[1], s[2]);
      px.rect(g, ox + p[0] - 5, oy + p[1] - 2, 10, 3, '#f8f8f4'); px.rect(g, ox + p[0] - 5, oy + p[1], 3, 7, '#f8f8f4'); px.rect(g, ox + p[0] + 2, oy + p[1], 3, 5, '#dfeef0'); }
  }
};
G.actor = (r, rig, o = {}) => {
  r.shadow(rig.px, rig.py, (o.shadow || 8), .3);
  r.actor(rig.px, rig.py, rig.pz || 0, (g, ox, oy) => { rig.draw(g, ox, oy, r.view); G.drawExtras(g, rig, ox, oy, r); }, o);
};

// Tare ------------------------------------------------------------------------------------------------------------
// A white slab with footprints, a small dial, short legs, cyan LED eyes on the front edge and eight faces.
G.FACES = { neutral: 1, happy: 1, worried: 1, smug: 1, shocked: 1, sad: 1, asleep: 1, judging: 1 };
G.drawTareAt = (g, cx, by, s = 1, face = 'neutral', sq = 0, wearTie = false, time = 0) => {
  const W = Math.round(17 * s * (1 + sq * .35)), H = Math.max(3, Math.round(6 * s * (1 - sq * .5))), top = Math.round(4 * s * (1 - sq * .5)), L = Math.max(1, Math.round(2 * s));
  const yb = by - L; // legs
  px.rect(g, cx - W + 2, yb, Math.max(2, 2 * s), L, '#9fb3bb'); px.rect(g, cx + W - 2 - Math.max(2, 2 * s), yb, Math.max(2, 2 * s), L, '#9fb3bb');
  // the top surface, then the front edge
  px.poly(g, [[cx - W + 2 * s, yb - H - top], [cx + W - 2 * s, yb - H - top], [cx + W, yb - H], [cx - W, yb - H]], '#ffffff');
  px.rect(g, cx - W, yb - H, W * 2, H, '#e6eff2'); px.rect(g, cx - W, yb - 1, W * 2, 1, '#b9cbd2');
  // footprints and dial
  const fy = yb - H - top * .55;
  px.ell(g, cx - W * .42, fy, 3 * s, 1.2 * s, '#d4e3e8'); px.ell(g, cx + W * .42, fy, 3 * s, 1.2 * s, '#d4e3e8');
  px.ell(g, cx, fy, 2 * s, 1 * s, '#bcd9e2'); px.rect(g, cx, fy - 1 * s, 1, 1 * s, '#e0553a');
  // face on the front edge
  const ey = yb - H * .55, ex = W * .42, C = '#20c8ec', D2 = '#0a7f9a', e = Math.max(1, Math.round(s));
  const eye = (x, kind) => {
    if (kind === 'dot') px.rect(g, x - e, ey - e, e * 2, e * 2, C);
    else if (kind === 'wide') px.rect(g, x - e, ey - e * 2, e * 2, e * 3, C);
    else if (kind === 'line') px.rect(g, x - e * 2, ey, e * 4, e, C);
    else if (kind === 'up') { px.rect(g, x - e * 2, ey, e, e, C); px.rect(g, x - e, ey - e, e * 2, e, C); px.rect(g, x + e, ey, e, e, C); }
    else if (kind === 'down') { px.rect(g, x - e * 2, ey - e, e, e, C); px.rect(g, x - e, ey, e * 2, e, C); px.rect(g, x + e, ey - e, e, e, C); }
  };
  const blink = Math.sin(time * 1.3) > .985;
  const F = { neutral: ['dot', 'dot'], happy: ['up', 'up'], worried: ['down', 'dot'], smug: ['line', 'up'], shocked: ['wide', 'wide'], sad: ['down', 'down'], asleep: ['line', 'line'], judging: ['line', 'dot'] }[face] || ['dot', 'dot'];
  eye(cx - ex, blink ? 'line' : F[0]); eye(cx + ex, blink ? 'line' : F[1]);
  if (face === 'happy') px.rect(g, cx - e * 2, ey + e, e * 4, e, D2);
  if (face === 'sad' || face === 'worried') px.rect(g, cx - e, ey + e, e * 2, e, D2);
  if (face === 'shocked') px.rect(g, cx - e, ey, e * 2, e * 2, D2);
  if (wearTie) { const ty = yb - H - top * .1; px.poly(g, [[cx, ty], [cx - 3 * s, ty - 1.6 * s], [cx - 3 * s, ty + 1.6 * s]], '#e0553a'); px.poly(g, [[cx, ty], [cx + 3 * s, ty - 1.6 * s], [cx + 3 * s, ty + 1.6 * s]], '#e0553a'); }
};
G.tarePortrait = (face = 'neutral') => (g, x, y, size) => { px.rect(g, x, y, size, size, '#d8f3fb'); G.drawTareAt(g, x + size / 2, y + size - 8, size / 42, G.talkFace || face, 0, false, G.game.real); };
G.Tare = class {
  constructor(x, y, o = {}) { this.x = x; this.y = y; this.z = 0; this.vz = 0; this.sq = 0; this.sv = 0; this.face = o.face || 'neutral'; this.s = o.s || 1; this.hopT = 1 + G.rng(); this.onGround = true; this.auto = o.auto !== false; }
  hop(v = 70) { if (this.z <= 0) { this.vz = v; this.sv = -5; G.sfx('tareHop', { vol: .25 }); } }
  update(dt) {
    if (this.auto) { this.hopT -= dt; if (this.hopT <= 0) { this.hopT = 1.2 + G.rng() * 2; this.hop(); } }
    this.vz -= 300 * dt; this.z += this.vz * dt; if (this.z <= 0) { if (this.vz < -30) this.sv = 6; this.z = 0; this.vz = 0; }
    this.sv += (-this.sq * 90 - this.sv * 10) * dt; this.sq += this.sv * dt;
  }
  draw(r, o = {}) {
    r.shadow(this.x, this.y, 7 * this.s, .22);
    r.queue(this.x, this.y, this.z, g => { const p = r.w(this.x, this.y, this.z); G.drawTareAt(g, p[0], p[1], this.s, this.face, this.sq, G.state && G.state.minutes >= 20, G.game.real); }, o);
  }
};

// Gerald: a ceramic hippo with a coin slot. He swallows minutes. Sometimes he has a friend.
G.drawGeraldAt = (g, x, y, s = 1, friend = false, gulp = 0) => {
  const c = '#9fb8d0', d = '#7d97b4', l = '#c3d6e6', W = 14 * s, H = 9 * s + gulp * s;
  const one = (x, y, s, W, H) => {
    px.ell(g, x, y - H, W, H, c); px.ell(g, x - W * .3, y - H * 1.35, W * .45, H * .45, l);
    px.ell(g, x + W * .85, y - H * .9, W * .55, H * .72, c); px.ell(g, x + W * 1.05, y - H * .68, W * .36, H * .38, l);
    px.rect(g, x + W * .95, y - H * .72, 1, 1, d); px.rect(g, x + W * 1.2, y - H * .72, 1, 1, d);
    px.disc(g, x + W * .75, y - H * 1.45, Math.max(1, 1.6 * s), '#ffffff'); px.rect(g, x + W * .75, y - H * 1.45, 1, 1, '#20404c');
    px.disc(g, x + W * .55, y - H * 1.65, Math.max(1, 1.6 * s), d);
    for (const lx of [-W * .7, -W * .25, W * .25, W * .6]) px.rect(g, x + lx, y - 3 * s, 4 * s, 3 * s, d);
    px.rect(g, x - W * .3, y - H * 2 + 1, 6 * s, Math.max(1, s), '#20404c');
  };
  one(x, y, s, W, H);
  if (friend) one(x - W * 1.6, y, s * .55, W * .55, H * .55);
};

// Regulars' walking helper for the island and backgrounds
G.Blobs = { gull: () => new E.Blob({ R: 3, wings: true, colors: { dk: '#b9c7cf', base: '#f4f7f8', lt: '#ffffff', spec: '#ffffff', eye: '#20303a', pupil: '#20303a' } }), pigeon: () => new E.Blob({ R: 3, wings: true, feet: true, colors: { dk: '#68727f', base: '#8e99a8', lt: '#b6bfcb', spec: '#ffffff', eye: '#d0602a', pupil: '#20303a' } }) };
