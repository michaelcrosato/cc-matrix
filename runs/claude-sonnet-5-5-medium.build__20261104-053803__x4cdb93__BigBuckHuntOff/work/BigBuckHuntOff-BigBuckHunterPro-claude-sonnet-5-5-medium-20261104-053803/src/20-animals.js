/* Animals: species presets, a four-legged rig (joints, gaits, poses, antlers), hit zones, AI and critters. */
(() => {
const BB = globalThis.BB, E = BB.E, px = E.px, clamp = BB.clamp, lerp = BB.lerp;
const RAD = Math.PI / 180;

/* ---------- species ---------- */
BB.SPECIES = {
  whitetail: { name: 'Whitetail', male: 'Buck', female: 'Doe', young: 'Fawn', size: 1, L: 1.55, leg: .62, bodyR: .27, neck: .45, head: .3, hp: 1, walk: 1.3, trot: 3.4, run: 8.5,
    body: '#a56b3b', belly: '#dccaa6', dark: '#5e3c20', legc: '#8a5a32', base: 100, perPt: 15, tail: 'white', antler: '#e6dcc0', ptsRange: [4, 12], trophy: 14, unit: 'pts' },
  elk: { name: 'Elk', male: 'Bull', female: 'Cow', young: 'Calf', size: 1.45, L: 1.65, leg: .62, bodyR: .27, neck: .55, head: .32, hp: 1.5, walk: 1.4, trot: 4, run: 9,
    body: '#9c7a52', belly: '#c9ae80', dark: '#3d2a1c', legc: '#4a3223', base: 150, perPt: 20, tail: 'patch', antler: '#e0d2ae', ptsRange: [5, 12], trophy: 14, unit: 'pts' },
  moose: { name: 'Moose', male: 'Bull', female: 'Cow', young: 'Calf', size: 1.85, L: 1.5, leg: .66, bodyR: .29, neck: .38, head: .46, hp: 2, walk: 1.5, trot: 4.5, run: 8,
    body: '#3b2a22', belly: '#2a1d18', dark: '#241812', legc: '#9a8a74', base: 200, perPt: 6, tail: 'short', antler: '#d9c79a', ptsRange: [40, 55], trophy: 72, unit: 'in', palmate: true },
  cow: { name: 'Cow', male: 'Bull', female: 'Cow', young: 'Calf', size: 1.15, L: 1.6, leg: .5, bodyR: .34, neck: .4, head: .34, hp: 3, walk: 1, trot: 2.5, run: 5,
    body: '#f1ede2', belly: '#e0d8c6', dark: '#2a2420', legc: '#e6e0d0', base: 0, perPt: 0, tail: 'short', antler: '#e6dcc0', ptsRange: [0, 0], spots: true },
  canid: { name: 'Canid', male: 'Wolf', female: 'Wolf', young: 'Pup', size: .5, L: 1.2, leg: .5, bodyR: .2, neck: .3, head: .3, hp: 1, walk: 1.5, trot: 4, run: 9,
    body: '#8a8a88', belly: '#c9c4b8', dark: '#44413e', legc: '#6a6866', base: 0, perPt: 0, tail: 'brush', antler: '#fff', ptsRange: [0, 0], snout: true }
};

/* ---------- rig: joints in local metres (x forward, z up) ---------- */
function ik(ax, az, fx, fz, l1, l2, bend) {
  let dx = fx - ax, dz = fz - az, d = Math.hypot(dx, dz); const mx = (l1 + l2) * .999;
  if (d > mx) { dx *= mx / d; dz *= mx / d; d = mx; }
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const ux = dx / d, uz = dz / d;
  return [ax + ux * a + (-uz) * h * bend, az + uz * a + ux * h * bend, ax + dx, az + dz];
}
const POSES = {
  stand: { neck: 52, head: -12 }, alert: { neck: 66, head: 4 }, graze: { neck: -38, head: -52 }, walk: { neck: 42, head: -8 },
  trot: { neck: 40, head: -4 }, run: { neck: 28, head: 6 }, drink: { neck: -30, head: -50 }, frozen: { neck: 68, head: 6 }, charge: { neck: 18, head: -6 }
};
BB.rigJoints = (a) => {
  const sp = BB.SPECIES[a.species], j = a.J || (a.J = {});
  const sz = (a.age === 'young' ? .55 : 1);
  const L = sp.L * sz, leg = sp.leg * sz, br = sp.bodyR * sz, nl = sp.neck * sz, hl = sp.head * sz;
  const pose = POSES[a.pose] || POSES.stand;
  const run = a.gait === 'run' || a.gait === 'charge' ? 1 : 0;
  const ph = a.phase;
  const bob = a.gait === 'walk' ? Math.sin(ph * 2) * .01 : run ? Math.abs(Math.sin(ph)) * .12 * sz : a.gait === 'trot' ? Math.abs(Math.sin(ph)) * .03 : 0;
  let bz = leg + br * .55 + bob;
  const dead = a.dead ? clamp(a.deadT / .7, 0, 1) : 0;
  if (dead > 0) bz = lerp(bz, br * .85, dead);
  j.L = L; j.leg = leg; j.br = br; j.sz = sz; j.bz = bz;
  j.S = [L * .33, bz + .04 * sz]; j.Hp = [-L * .34, bz]; j.C = [0, bz];
  const headDown = a.pose === 'graze' || a.pose === 'drink';
  const neckA = (pose.neck + (a.gait === 'walk' ? Math.sin(ph) * 5 : 0) + (a.headBob || 0)) * RAD;
  j.N0 = [j.S[0] + L * .1, j.S[1] + br * .5];
  if (dead > 0) { j.N0 = [j.S[0] + L * .1, bz + br * .2]; }
  const na = dead > 0 ? lerp(neckA, -.35, dead) : neckA;
  j.Hd0 = [j.N0[0] + Math.cos(na) * nl, j.N0[1] + Math.sin(na) * nl];
  const ha = (dead > 0 ? lerp(pose.head * RAD, -.9, dead) : pose.head * RAD + (neckA < 0 ? 0 : 0));
  const headAng = na + (headDown ? -.7 : -.55) + (a.pose === 'alert' || a.pose === 'frozen' ? .35 : 0) + (run ? .25 : 0);
  j.Hc = [j.Hd0[0] + Math.cos(headAng) * hl * .55, j.Hd0[1] + Math.sin(headAng) * hl * .55];
  j.Hm = [j.Hd0[0] + Math.cos(headAng) * hl, j.Hd0[1] + Math.sin(headAng) * hl]; j.headAng = headAng; j.hl = hl;
  if (j.Hm[1] < .05 * sz) { const dz = .05 * sz - j.Hm[1]; j.Hd0[1] += dz; j.Hc[1] += dz; j.Hm[1] += dz; }
  /* legs: foreleg pair, hind pair */
  const stride = (a.gait === 'run' ? .75 : a.gait === 'trot' ? .45 : a.gait === 'walk' ? .3 : 0) * sz * (a.limp ? .5 : 1);
  const lift = (a.gait === 'run' ? .28 : a.gait === 'trot' ? .18 : .1) * sz;
  const legs = [];
  const mk = (ax, az, phase, bend, shade) => {
    let fx = ax + Math.sin(phase) * stride, fz = Math.max(0, Math.cos(phase)) * lift * (stride ? 1 : 0);
    if (a.pose === 'graze' && !stride) { fx = ax; }
    if (dead > 0) { fx = ax + (shade ? -.15 : .45) * sz * dead; fz = lerp(fz, br * .4 + (shade ? .2 : 0), dead); const kk = ik(ax, az, fx, fz, leg * .5, leg * .5, bend); return { ax, az, kx: kk[0], kz: kk[1], fx: kk[2], fz: kk[3], shade }; }
    if (a.limp && !shade && bend > 0) { fz = leg * .45; fx = ax - .1 * sz; }
    const k = ik(ax, az, fx, fz, leg * .52, leg * .56, bend);
    return { ax, az, kx: k[0], kz: k[1], fx: k[2], fz: k[3], shade };
  };
  const walkOff = a.gait === 'run' ? [0, .3, .5, .8] : [0, Math.PI, Math.PI * .5, Math.PI * 1.5];
  const fa = [j.S[0] - L * .05, j.S[1] - br * .55], ha2 = [j.Hp[0] + L * .03, j.Hp[1] - br * .5];
  const groundZ = 0;
  const legTop = (p) => leg * 1.0 + (p[1] - (leg + br * .55)) * 0 - 0;
  legs.push(mk(fa[0], fa[1] - (bz - (leg + br * .55)) * 0 + 0, ph + walkOff[0] + Math.PI, -1, true));
  legs.push(mk(ha2[0], ha2[1], ph + walkOff[1] + Math.PI, 1, true));
  legs.push(mk(fa[0], fa[1], ph + walkOff[2] + Math.PI, -1, false));
  legs.push(mk(ha2[0], ha2[1], ph + walkOff[3] + Math.PI, 1, false));
  /* planting feet on the ground: when bz bobs up the feet stay down (ik lengthens up to its max) */
  j.legs = legs;
  return j;
};
BB.antlerSpec = (a) => {
  const sp = BB.SPECIES[a.species]; if (a.sex !== 'male') return null;
  const pts = a.pts || 8;
  const n = sp.palmate ? 5 : Math.max(2, Math.round(pts / 2));
  return { n, pts, palmate: !!sp.palmate };
};
function antlerPolys(a, j, S) {
  /* returns beams (polyline in local metres) for a near and a far antler plus palm polygon */
  const sp = BB.SPECIES[a.species], spec = BB.antlerSpec(a); if (!spec) return null;
  const boost = BB.T.antlerBoost, sz = j.sz;
  const ba = j.headAng, base = [j.Hd0[0] + Math.cos(ba) * j.hl * .22, j.Hd0[1] + Math.sin(ba) * j.hl * .22 + j.hl * .15];
  const len = (sp.palmate ? .75 : (sp.size > 1.2 ? .95 : .58)) * boost * sz * (.75 + spec.pts / (sp.palmate ? 90 : 26));
  const out = { beams: [], tines: [], palm: null };
  for (const side of [0, 1]) {
    const dx = side ? -.04 : .04, off = side ? -.07 : .07;
    const bx = base[0] + dx, bz = base[1];
    const pts = []; const segs = 4;
    for (let i = 0; i <= segs; i++) { const t = i / segs; pts.push([bx - Math.cos(ba) * .0 + (-.15 + t * .5 + (sp.palmate ? t * .15 : 0)) * len * (side ? .9 : 1) + off, bz + (Math.sin(t * 2.2) * .5 + t * .52) * len * (sp.palmate ? .7 : 1)]); }
    out.beams.push({ pts, side });
    const tn = sp.palmate ? 0 : Math.min(spec.n, 7);
    for (let i = 0; i < tn; i++) { const t = (i + 1.2) / (tn + .9), p0 = pts[Math.min(segs, Math.floor(t * segs))], p1 = pts[Math.min(segs, Math.floor(t * segs) + 1)], f = t * segs - Math.floor(t * segs); const tx = lerp(p0[0], p1[0], f), tz = lerp(p0[1], p1[1], f); out.tines.push({ x: tx, z: tz, l: (.22 + (i % 2) * .08) * len * (1.1 - t * .5), a: 80 + (i % 2) * 18 - t * 20, side }); }
    if (sp.palmate && !side) { const top = pts[segs], mid = pts[2]; out.palm = [[mid[0] - .05, mid[1]], [top[0] - .45 * len, top[1] + .1 * len], [top[0] - .2 * len, top[1] + .3 * len], [top[0] + .1 * len, top[1] + .4 * len], [top[0] + .35 * len, top[1] + .15 * len], [pts[3][0] + .05, pts[3][1] - .05]]; }
  }
  return out;
}

/* ---------- drawing ---------- */
const X = (a, sx, k, sc) => lx => sx + a.face * lx * k * sc;
BB.drawAnimal = (g, a, sx, sy, k, v, opt = {}) => {
  const sp = BB.SPECIES[a.species], sc = (opt.scale || sp.size * BB.T.animalScale), j = BB.rigJoints(a);
  const T = lx => sx + a.face * lx * k * sc, Z = lz => sy - lz * k * sc;
  const pxm = Math.max(1, k * sc * .06);
  const xray = opt.xray;
  let body = xray ? '#2b3a55' : a.age === 'young' ? mix(sp.body, '#d8b070', .4) : (a.sex === 'female' ? mix(sp.body, sp.belly, .15) : sp.body);
  let T0 = E.tones(body), dk = xray ? '#1a2540' : sp.dark, belly = xray ? '#3b4f73' : sp.belly, lg = xray ? '#21304d' : sp.legc;
  if (opt.paper) { T0 = E.tones('#e9e3cf'); dk = '#8a8478'; belly = '#fbf8ee'; lg = '#cfc8b4'; }
  if (opt.paper) body = '#e9e3cf';
  const fade = a.alpha === undefined ? 1 : a.alpha;
  const draw = () => {
    /* shadow */
    if (!xray) px.blend(g, .3, 'normal', () => px.ell(g, T(0), sy, j.L * k * sc * .55, Math.max(1, k * sc * .08), '#000'));
    const lw = Math.max(1, k * sc * .09 * j.sz), thin = Math.max(1, k * sc * .06 * j.sz);
    const drawLeg = l => {
      const c = l.shade ? mix(lg, '#000', .35) : lg;
      px.line(g, T(l.ax), Z(l.az), T(l.kx), Z(l.kz), c, Math.max(1, Math.round(lw)));
      px.line(g, T(l.kx), Z(l.kz), T(l.fx), Z(l.fz), c, Math.max(1, Math.round(thin)));
      px.rect(g, T(l.fx) - Math.max(1, thin / 2), Z(l.fz) - 1, Math.max(1, thin) + 1, Math.max(1, thin / 2) + 1, mix(c, '#000', .5));
    };
    j.legs[0] && drawLeg(j.legs[0]); j.legs[1] && drawLeg(j.legs[1]);
    /* tail */
    const ty = j.Hp[1] + j.br * .35, tx = j.Hp[0] - j.L * .13;
    const flag = a.mode === 'flee' || a.gait === 'run';
    if (sp.tail === 'white') { const up = flag ? .26 : .1; px.poly(g, [[T(tx), Z(ty)], [T(tx - .12 * j.sz), Z(ty + up * j.sz)], [T(tx - .2 * j.sz), Z(ty + up * .3)], [T(tx + .02), Z(ty - .06)]], xray ? '#2b3a55' : '#f4f0e6'); }
    else if (sp.tail === 'brush') px.line(g, T(tx), Z(ty), T(tx - .45 * j.sz), Z(ty - .15), body, Math.max(1, thin));
    else px.rect(g, T(tx) - (a.face > 0 ? 2 : 0), Z(ty), 2, Math.max(1, k * sc * .15), dk);
    /* body: rump, barrel, chest */
    px.ell(g, T(j.Hp[0]), Z(j.Hp[1]), j.br * k * sc * 1.05, j.br * k * sc * 1.0, T0.base);
    px.ell(g, T(0), Z(j.bz), j.L * k * sc * .5, j.br * k * sc * .96, T0.base);
    px.ell(g, T(j.S[0]), Z(j.S[1]), j.br * k * sc * 1.05, j.br * k * sc * 1.04, T0.base);
    /* shading: dark back, light belly, highlight */
    px.ell(g, T(0), Z(j.bz - j.br * .55), j.L * k * sc * .42, j.br * k * sc * .38, belly);
    px.ell(g, T(-.05), Z(j.bz + j.br * .55), j.L * k * sc * .46, j.br * k * sc * .3, T0.lt);
    px.ell(g, T(.1), Z(j.bz + j.br * .86), j.L * k * sc * .4, Math.max(.5, j.br * k * sc * .12), T0.sh);
    if (sp.spots && !xray) for (let i = 0; i < 4; i++) px.ell(g, T(-.5 + i * .35), Z(j.bz + (i % 2 ? .1 : -.05)), j.br * k * sc * .35, j.br * k * sc * .25, '#2a2420');
    if (a.age === 'young' && !xray) for (let i = 0; i < 5; i++) px.dot(g, T(-.3 + i * .15), Z(j.bz + .06 + (i % 2) * .05), '#f4f0e6');
    if (sp.tail === 'patch' && !xray) px.ell(g, T(j.Hp[0] - j.L * .1), Z(j.Hp[1] + .03), j.br * k * sc * .5, j.br * k * sc * .55, '#d7c28e');
    if (sp.id === 'moose' || a.species === 'moose') { px.ell(g, T(j.S[0] + .1), Z(j.S[1] + j.br * .8), j.br * k * sc * .8, j.br * k * sc * .55, E.tones(body).sh); }
    /* neck */
    px.line(g, T(j.N0[0] - .05), Z(j.N0[1] - j.br * .2), T(j.Hd0[0]), Z(j.Hd0[1]), mix(body, dk, .2), Math.max(2, Math.round(k * sc * j.br * .85)));
    px.line(g, T(j.N0[0]), Z(j.N0[1] + j.br * .1), T(j.Hd0[0]), Z(j.Hd0[1] + .03), T0.lt, Math.max(1, Math.round(k * sc * j.br * .25)));
    /* head */
    const hw = j.hl * k * sc;
    px.line(g, T(j.Hd0[0]), Z(j.Hd0[1]), T(j.Hm[0]), Z(j.Hm[1]), sp.snout || a.species === 'moose' ? mix(body, '#6a5a4c', .3) : mix(body, '#b88a60', .3), Math.max(2, Math.round(hw * (a.species === 'moose' ? .5 : .42))));
    px.disc(g, T(j.Hm[0]), Z(j.Hm[1]), Math.max(1, hw * .13), mix('#1a1410', '#000', .2));
    px.disc(g, T(j.Hc[0] - Math.cos(j.headAng) * j.hl * .12), Z(j.Hc[1] + .02 * j.sz + Math.sin(j.headAng) * 0), Math.max(.6, hw * .06), '#0a0806');
    /* ears */
    const eb = [j.Hd0[0] + Math.cos(j.headAng) * j.hl * .18, j.Hd0[1] + Math.sin(j.headAng) * j.hl * .18 + j.hl * .18];
    const earUp = a.pose === 'alert' || a.pose === 'frozen' ? 1 : .6;
    px.poly(g, [[T(eb[0]), Z(eb[1])], [T(eb[0] - .12 * j.sz * earUp - .02), Z(eb[1] + .2 * j.sz * earUp)], [T(eb[0] - .02), Z(eb[1] + .02)]], mix(body, dk, .3));
    /* near legs over the body */
    drawLeg(j.legs[2]); drawLeg(j.legs[3]);
    /* antlers */
    if (a.sex === 'male' && !a.dead) {
      const an = antlerPolys(a, j); const ac = xray ? '#7aa7ff' : sp.antler, w = Math.max(1, Math.round(k * sc * .045));
      if (an) {
        if (an.palm) px.poly(g, an.palm.map(p => [T(p[0]), Z(p[1])]), mix(ac, '#6a5a3c', .25));
        for (const b of an.beams) for (let i = 0; i < b.pts.length - 1; i++) px.line(g, T(b.pts[i][0]), Z(b.pts[i][1]), T(b.pts[i + 1][0]), Z(b.pts[i + 1][1]), b.side ? mix(ac, '#4a3a22', .35) : ac, w);
        for (const t of an.tines) { const aa = t.a * RAD; px.line(g, T(t.x), Z(t.z), T(t.x + Math.cos(aa) * t.l * .35), Z(t.z + Math.sin(aa) * t.l), t.side ? mix(ac, '#4a3a22', .35) : ac, w); }
      }
    }
  };
  if (fade < 1) px.blend(g, fade, 'normal', draw); else draw();
  return j;
};
function mix(a, b, t) { return BB.mixc(a, b, t); }

/* ---------- hit zones, in screen space ---------- */
/* returns [{ kind, cx, cy, r } or { kind, x0,y0,x1,y1,r }] */
BB.animalZones = (a, sx, sy, k) => {
  const sp = BB.SPECIES[a.species], sc = sp.size * BB.T.animalScale, j = BB.rigJoints(a);
  const T = lx => sx + a.face * lx * k * sc, Z = lz => sy - lz * k * sc, R = r => Math.max(1.2, r * k * sc);
  const z = [];
  const heart = [j.S[0] - j.L * .08, j.bz - j.br * .15];
  z.push({ kind: 'heart', cx: T(heart[0]), cy: Z(heart[1]), r: R(j.br * .62) });
  z.push({ kind: 'head', cx: T(j.Hc[0]), cy: Z(j.Hc[1]), r: R(j.hl * .42) });
  z.push({ kind: 'lung', cx: T(j.S[0] - j.L * .2), cy: Z(j.bz + j.br * .22), r: R(j.br * .92) });
  z.push({ kind: 'neck', x0: T(j.N0[0]), y0: Z(j.N0[1]), x1: T(j.Hd0[0]), y1: Z(j.Hd0[1]), r: R(j.br * .42) });
  z.push({ kind: 'shoulder', cx: T(j.S[0] + .02), cy: Z(j.S[1] - j.br * .05), r: R(j.br * .85) });
  z.push({ kind: 'gut', x0: T(j.S[0] - j.L * .3), y0: Z(j.bz), x1: T(j.Hp[0] + j.L * .1), y1: Z(j.bz), r: R(j.br * .88) });
  z.push({ kind: 'ham', cx: T(j.Hp[0]), cy: Z(j.Hp[1]), r: R(j.br * 1.0) });
  for (const l of j.legs) { z.push({ kind: 'leg', x0: T(l.ax), y0: Z(l.az), x1: T(l.kx), y1: Z(l.kz), r: R(.07 * j.sz) }); z.push({ kind: 'leg', x0: T(l.kx), y0: Z(l.kz), x1: T(l.fx), y1: Z(l.fz), r: R(.06 * j.sz) }); }
  if (a.sex === 'male' && !a.dead) {
    const an = antlerPolys(a, j);
    if (an) {
      for (const b of an.beams) for (let i = 0; i < b.pts.length - 1; i++) z.push({ kind: 'antler', x0: T(b.pts[i][0]), y0: Z(b.pts[i][1]), x1: T(b.pts[i + 1][0]), y1: Z(b.pts[i + 1][1]), r: R(.04) });
      if (an.palm) { const c = an.palm.reduce((s, p) => [s[0] + p[0] / an.palm.length, s[1] + p[1] / an.palm.length], [0, 0]); z.push({ kind: 'antler', cx: T(c[0]), cy: Z(c[1]), r: R(.3 * BB.T.antlerBoost) }); }
    }
  }
  return z;
};
BB.ZONE_PRIORITY = ['heart', 'head', 'lung', 'neck', 'shoulder', 'gut', 'ham', 'leg', 'antler'];
BB.ZONE_INFO = {
  heart: { lethal: true, dmg: 9, mult: () => BB.T.heartMult, call: 'HEART SHOT!' }, head: { lethal: true, dmg: 9, mult: () => BB.T.headMult, call: 'HEADSHOT!' },
  lung: { lethal: true, dmg: 9, mult: () => BB.T.lungMult, call: 'LUNG SHOT!' }, neck: { lethal: true, dmg: 9, mult: () => 1.4, call: 'NECK SHOT!' },
  shoulder: { lethal: true, dmg: 9, mult: () => 1.2, call: 'SHOULDER!' }, gut: { lethal: false, dmg: .6, mult: () => .7, call: 'GUT SHOT... FINISH HIM!' },
  ham: { lethal: false, dmg: .5, mult: () => .6, call: 'HAM HIT' }, leg: { lethal: false, dmg: .4, mult: () => .5, call: 'LEG HIT' }, antler: { lethal: false, dmg: 0, mult: () => 0, call: 'ANTLER PING!' }
};
function distSeg(px_, py_, x0, y0, x1, y1) { const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy; let t = l2 ? ((px_ - x0) * dx + (py_ - y0) * dy) / l2 : 0; t = clamp(t, 0, 1); return Math.hypot(px_ - (x0 + dx * t), py_ - (y0 + dy * t)); }
BB.zoneContains = (z, x, y) => z.cx !== undefined ? Math.hypot(x - z.cx, y - z.cy) <= z.r : distSeg(x, y, z.x0, z.y0, z.x1, z.y1) <= z.r;
BB.zoneAt = (zones, x, y) => {
  let best = null, bi = 99;
  for (const z of zones) { if (!BB.zoneContains(z, x, y)) continue; const pi = BB.ZONE_PRIORITY.indexOf(z.kind); if (pi < bi) { bi = pi; best = z.kind; } }
  return best;
};
/* hit point to local body coordinates (for the shot chart) */
BB.toLocal = (a, sx, sy, k, hx, hy) => { const sc = BB.SPECIES[a.species].size * BB.T.animalScale; return [a.face * (hx - sx) / (k * sc), (sy - hy) / (k * sc)]; };

/* ---------- animals at runtime ---------- */
let nextId = 1;
BB.newId = () => nextId++;
BB.resetIds = () => { nextId = 1; };
/* spec: { species, sex, age, pts, x, y, to:[x,y], behavior, gait, linger, wait, trait, trophy, name } */
BB.makeAnimal = (spec, site) => {
  const sp = BB.SPECIES[spec.species];
  const a = Object.assign({
    kind: 'animal', id: BB.newId(), sex: 'male', age: 'adult', pts: 8, x: 0, y: 40, z: 0, face: 1, mode: 'graze', pose: 'graze', gait: 'stand', phase: 0, hp: sp.hp, maxHp: sp.hp,
    speed: 0, spookT: -1, frozenT: 0, grazeT: BB.rand(1, 3, 'ai'), alert: 0, dead: false, deadT: 0, wounded: false, limp: false, escaped: false, hits: [], born: 0, visible: false, seenAt: -1,
    behavior: 'graze', linger: 8, wait: 0, path: [], tx: null, trait: null, exitTo: null, killer: null, headBob: 0, fear: 0
  }, spec);
  if (a.age === 'young') { a.sex = 'female'; a.hp = .7; }
  a.target = a.sex === 'male' && !a.protectedOverride;
  a.protected = !a.target;
  if (a.exitTo === null && a.to) a.exitTo = a.to;
  a.hp = a.maxHp = sp.hp * (a.hpMult || 1);
  return a;
};
function dirTo(a, tx, ty) { const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d, d]; }
BB.animalFlee = (a, delay = 0) => {
  if (a.dead || a.mode === 'flee') return;
  a.spookT = delay; a.mode = a.mode === 'frozen' ? 'frozen' : a.mode;
};
BB.animalStartFlee = (a, ctx) => {
  a.mode = 'flee'; a.pose = 'run'; a.gait = a.wounded ? 'trot' : 'run';
  const b = ctx.site.bounds, side = a.fleeSide || (a.x >= 0 ? 1 : -1);
  const tx = a.flee ? a.flee[0] : side * (b.x + 20), ty = a.flee ? a.flee[1] : Math.max(a.y + 12, a.y * 1.25);
  a.path = [[tx, ty]]; a.exitTo = [tx, ty];
};
BB.updateAnimal = (a, dt, ctx) => {
  const sp = BB.SPECIES[a.species], spd = BB.T.animalSpeed;
  a.age_t = (a.age_t || 0) + dt;
  if (a.dead) { a.deadT += dt; a.pose = 'stand'; a.gait = 'stand'; a.rigDead = true; BB.rigJoints(a); return; }
  if (a.fear > 0) a.fear = Math.max(0, a.fear - dt);
  /* spook countdown */
  if (a.spookT >= 0) { a.spookT -= dt; if (a.spookT < 0 && a.mode !== 'flee') { if (a.mode === 'frozen' && a.frozenT > 0) { a.spookT = a.frozenT; } else { a.frozenT = 0; BB.animalStartFlee(a, ctx); } } }
  /* freeze (called) */
  if (a.mode === 'frozen') {
    a.frozenT -= dt; a.pose = 'frozen'; a.gait = 'stand';
    a.face = a.faceCam || a.face;
    if (a.frozenT <= 0) { a.mode = a.preFreeze || 'graze'; a.preFreeze = null; if (a.mode === 'walk' || a.mode === 'flee') { a.pose = a.mode === 'flee' ? 'run' : 'walk'; a.gait = a.mode === 'flee' ? 'run' : 'walk'; } }
    BB.rigJoints(a); return;
  }
  const move = (speed) => {
    if (!a.path.length) { return true; }
    const [tx, ty] = a.path[0]; const [dx, dy, d] = dirTo(a, tx, ty);
    const sv = speed * spd * (a.limp ? .55 : 1);
    const step = sv * dt;
    if (d <= step + .05) { a.x = tx; a.y = ty; a.path.shift(); return a.path.length === 0; }
    a.x += dx * step; a.y += dy * step; a.phase += step / (a.gait === 'run' ? .42 : a.gait === 'trot' ? .3 : .22); a.speed = sv;
    const rx = Math.cos(ctx.view.yaw), ry = -Math.sin(ctx.view.yaw); const lateral = dx * rx + dy * ry;
    if (Math.abs(lateral) > .12) a.face = lateral > 0 ? 1 : -1;
    return false;
  };
  a.speed = 0;
  if (a.mode === 'graze' || a.mode === 'stand') {
    a.gait = 'stand'; a.grazeT -= dt;
    if (a.behavior === 'stare' && a.stareT !== undefined) { a.pose = 'alert'; }
    else if (a.grazeT > 0 || a.mode === 'stand') { a.pose = (a.mode === 'stand' || a.alert > 0) ? 'alert' : 'graze'; }
    if (a.alert > 0) { a.alert -= dt; }
    if (a.grazeT <= 0) { if (a.pose === 'graze') { a.alert = .9; a.grazeT = BB.rand(2.5, 6, 'ai'); a.pose = 'alert'; } else a.grazeT = BB.rand(2.5, 6, 'ai'); }
    a.linger -= dt;
    if (a.linger <= 0 && a.to) { a.mode = 'walk'; a.path = [[a.to[0], a.to[1]]]; a.pose = 'walk'; a.gait = a.gaitMove || 'walk'; }
  } else if (a.mode === 'walk') {
    a.pose = a.gait === 'run' ? 'run' : a.gait === 'trot' ? 'trot' : 'walk';
    const spdv = sp[a.gait] || sp.walk;
    if (move(spdv)) { if (a.exitTo && Math.hypot(a.x - a.exitTo[0], a.y - a.exitTo[1]) < 1.5 && a.exits !== false) a.escaped = true; else { a.mode = 'graze'; a.gait = 'stand'; a.linger = 6; a.to = a.nextTo || null; a.grazeT = BB.rand(1, 3, 'ai'); } }
  } else if (a.mode === 'flee') {
    a.pose = a.gait === 'run' ? 'run' : 'trot';
    if (move(a.gait === 'run' ? sp.run * (a.fleeMult || 1) : sp.trot)) a.escaped = true;
  } else if (a.mode === 'charge') {
    a.pose = 'charge'; a.gait = 'run';
    move(sp.run * (a.chargeMult || 1.18));
  } else if (a.mode === 'hidden') { a.pose = 'stand'; a.gait = 'stand'; }
  a.z = ctx.terrain(a.x, a.y);
  BB.rigJoints(a);
};
/* a gunshot or impact: wake up nearby animals */
BB.spookAll = (ctx, amount = 1, from) => {
  const sp = BB.T.spook; if (sp <= 0) return;
  for (const a of ctx.animals) {
    if (a.dead || a.mode === 'flee' || a.mode === 'hidden') continue;
    if (a.trait === 'stubborn' && !a.hitByShot) { a.stareT = (a.stareT || 0) + 1; if (a.stareT < 3) { a.mode = 'stand'; a.pose = 'alert'; a.grazeT = 99; a.linger = 99; if (a.stareT === 2) BB.animalFlee(a, 1.2 / sp); continue; } }
    const near = from ? Math.hypot(a.x - from[0], a.y - from[1]) : 99;
    const delay = BB.rand(.15, .55, 'ai') / Math.max(.2, sp) + near * .002;
    if (a.spookT < 0 || a.spookT > delay) { if (a.mode === 'frozen') { a.spookT = a.frozenT; } else a.spookT = delay; }
  }
};
BB.callAnimals = (ctx, from, seconds) => {
  let n = 0;
  for (const a of ctx.animals) {
    if (a.dead || a.mode === 'hidden' || a.callImmune) continue;
    if (a.mode === 'frozen') continue;
    if (Math.hypot(a.x - from[0], a.y - from[1]) > 220) continue;
    a.preFreeze = a.mode === 'flee' ? 'flee' : a.mode; a.mode = 'frozen'; a.frozenT = seconds; a.pose = 'frozen'; a.gait = 'stand';
    a.spookT = a.spookT >= 0 ? Math.max(a.spookT, seconds + .1) : -1;
    const rx = Math.cos(ctx.view.yaw); a.faceCam = (a.x * rx > 0) ? -1 : 1; n++;
  }
  return n;
};

/* ---------- critters ---------- */
BB.CRITTERS = {
  squirrel: { name: 'Squirrel', pts: 50, size: .22, motion: 'hop', call: 'SQUIRREL!', col: '#8a5a32', shape: 'rodent', tail: true },
  rabbit: { name: 'Rabbit', pts: 75, size: .3, motion: 'hop', call: 'CRITTER BONUS!', col: '#9a8468', shape: 'rabbit' },
  hare: { name: 'Hare', pts: 125, size: .32, motion: 'hop', call: 'CRITTER BONUS!', col: '#f0f2f4', shape: 'rabbit' },
  turkey: { name: 'Turkey', pts: 150, size: .5, motion: 'walk', call: 'TURKEY DINNER!', col: '#6a4a2c', shape: 'turkey' },
  raccoon: { name: 'Raccoon', pts: 100, size: .3, motion: 'peek', call: 'CRITTER BONUS!', col: '#78787a', shape: 'raccoon' },
  skunk: { name: 'Skunk', pts: -100, size: .26, motion: 'walk', call: 'OH, THE STINK!', col: '#1a1a1c', shape: 'skunk', protected: true, stink: true },
  crow: { name: 'Crow', pts: 100, size: .5, motion: 'fly', call: 'CRITTER BONUS!', col: '#1b1b24', shape: 'bird' },
  goldcrow: { name: 'Golden crow', pts: 500, size: .56, motion: 'fly', call: 'GOLDEN CROW!', col: '#f2c83a', shape: 'bird', golden: true },
  raven: { name: 'Raven', pts: 100, size: .34, motion: 'fly', call: 'CRITTER BONUS!', col: '#14141c', shape: 'bird' },
  grouse: { name: 'Grouse', pts: 150, size: .3, motion: 'fly', call: 'CRITTER BONUS!', col: '#8a6a4a', shape: 'bird' },
  marmot: { name: 'Marmot', pts: 75, size: .3, motion: 'peek', call: 'CRITTER BONUS!', col: '#8a6a50', shape: 'rodent' },
  coyote: { name: 'Coyote', pts: 250, size: .5, motion: 'walk', call: 'COYOTE!', col: '#a08a6a', shape: 'canid' },
  wolf: { name: 'Wolf', pts: 300, size: .62, motion: 'walk', call: 'WOLF!', col: '#8a8a8e', shape: 'canid' },
  eagle: { name: 'Eagle', pts: -400, size: .6, motion: 'soar', call: "THAT'S THE NATIONAL BIRD, BUDDY!", col: '#4a3222', shape: 'eagle', protected: true },
  duck: { name: 'Duck', pts: 150, size: .3, motion: 'fly', call: 'CRITTER BONUS!', col: '#4a7a5a', shape: 'bird' },
  loon: { name: 'Loon', pts: -400, size: .42, motion: 'float', call: 'NOT THE LOON!', col: '#1a1c24', shape: 'loon', protected: true },
  beaver: { name: 'Beaver', pts: 100, size: .38, motion: 'swim', call: 'CRITTER BONUS!', col: '#6a4a2c', shape: 'beaver' },
  cow: { name: 'Bessie', pts: -500, size: 1, motion: 'cow', call: "THAT'S BESSIE!!", col: '#f1ede2', shape: 'cow', protected: true },
  clay: { name: 'Clay', pts: 75, size: .22, motion: 'clay', call: 'PULL!', col: '#e8742a', shape: 'clay' },
  goldclay: { name: 'Golden clay', pts: 500, size: .22, motion: 'clay', call: 'GOLDEN CLAY!', col: '#f2c83a', shape: 'clay', golden: true },
  snowball: { name: 'Snowball', pts: 75, size: .18, motion: 'ball', call: 'SNOWBALL!', col: '#ffffff', shape: 'ball' },
  hat: { name: 'Hat', pts: 150, size: .3, motion: 'hatfly', call: 'HAT TRICK!', col: '#2a2634', shape: 'hat' },
  snowmoose: { name: 'Snowmoose', pts: 0, size: 1.3, motion: 'big', call: 'THE SNOWMOOSE!', col: '#f0f4f7', shape: 'bigmoose' }
};
BB.makeCritter = (type, spec) => {
  const d = BB.CRITTERS[type];
  return Object.assign({ kind: 'critter', id: BB.newId(), type, def: d, x: 0, y: 30, z: 0, alt: 0, vx: 0, vy: 0, vz: 0, t: 0, face: 1, dead: false, deadT: 0, escaped: false, pop: 0, mode: 'idle', life: 20, seed: BB.rand(0, 100, 'ai') }, spec);
};
BB.updateCritter = (c, dt, ctx) => {
  c.t += dt; const d = c.def;
  if (c.dead) { c.deadT += dt; c.vz -= 20 * dt; c.alt = Math.max(0, c.alt + c.vz * dt); c.x += c.vx * dt * .3; c.y += c.vy * dt * .3; return; }
  c.life -= dt; if (c.life <= 0) { c.escaped = true; return; }
  switch (d.motion) {
    case 'hop': { const T = c.t * 3 + c.seed; if (c.mode === 'run' || c.mode === 'idle' && Math.sin(c.seed + c.t * .6) > .3) { const ph = T % 1; c.alt = Math.sin(ph * Math.PI) * .35; c.x += c.vx * dt; c.y += c.vy * dt; } else c.alt = 0; if (c.to && Math.hypot(c.x - c.to[0], c.y - c.to[1]) < 1) c.escaped = true; break; }
    case 'walk': case 'cow': { const sp = d.motion === 'cow' ? .3 : c.mode === 'run' ? 3 : .8; if (c.to) { const dx = c.to[0] - c.x, dy = c.to[1] - c.y, l = Math.hypot(dx, dy) || 1; c.x += dx / l * sp * dt; c.y += dy / l * sp * dt; c.face = dx > 0 ? 1 : -1; if (l < 1) c.escaped = true; } c.alt = 0; break; }
    case 'peek': { c.pop = Math.max(0, Math.sin(c.t * 1.3 + c.seed)); c.alt = 0; break; }
    case 'fly': { c.x += c.vx * dt; c.y += c.vy * dt; if (c.tAlt !== undefined) c.alt += (c.tAlt - c.alt) * Math.min(1, dt * 1.6); else c.alt += c.vz * dt; c.face = c.vx >= 0 ? 1 : -1; if (c.flapSine) c.alt += Math.sin(c.t * 9) * dt * .6; if (c.to && Math.hypot(c.x - c.to[0], c.y - c.to[1]) < 2) { if (c.perch) { c.mode = 'perched'; c.vx = c.vy = c.vz = 0; c.tAlt = c.perch.alt || 2; c.alt = c.tAlt; } else c.escaped = true; } break; }
    case 'soar': { const r = c.radius || 40; c.x = c.cx + Math.cos(c.t * .22) * r; c.y = c.cy + Math.sin(c.t * .22) * r * .3; c.alt = c.h0 + Math.sin(c.t * .5) * 1.2; c.face = -Math.sin(c.t * .22) > 0 ? 1 : -1; break; }
    case 'float': { c.alt = -.05; c.x += Math.sin(c.t * .3 + c.seed) * .2 * dt; break; }
    case 'swim': { if (c.to) { const dx = c.to[0] - c.x, dy = c.to[1] - c.y, l = Math.hypot(dx, dy) || 1; c.x += dx / l * 1.2 * dt; c.y += dy / l * 1.2 * dt; c.face = dx > 0 ? 1 : -1; if (l < 1) c.escaped = true; } break; }
    case 'clay': case 'ball': case 'hatfly': { c.vz -= (d.motion === 'clay' ? 9 : 9.8) * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.alt += c.vz * dt; if (c.alt < 0 && c.t > .3) { c.escaped = true; } break; }
    case 'big': { c.alt = Math.max(0, c.alt); break; }
  }
  if (c.alt === undefined) c.alt = 0;
  c.z = ctx.terrain(c.x, c.y);
};
BB.critterBox = (c, sx, sy, k) => {
  const d = c.def, s = d.size * (c.scale || 1) * k;
  let cy = sy - (c.alt || 0) * k - s * .6; let hh = s * .7, ww = s * .9;
  if (d.motion === 'peek') { if (c.pop < .25) return null; cy = sy - s * .5 * c.pop; }
  if (d.shape === 'eagle') { ww = s * 1.6; hh = s * .5; cy = sy - c.alt * k; }
  if (d.shape === 'bird') { ww = s * 1.1; hh = s * .6; cy = sy - c.alt * k; }
  if (d.shape === 'cow') { ww = s * 1.8; hh = s * 1.2; cy = sy - s * 1.1; }
  if (d.shape === 'bigmoose') { ww = s * 1.5; hh = s * 1.2; cy = sy - s; }
  if (d.shape === 'canid') { ww = s * 1.3; hh = s * .8; }
  if (d.shape === 'clay' || d.shape === 'ball') { ww = s * 1.6; hh = s * 1.6; cy = sy - (c.alt || 0) * k; }
  if (d.shape === 'hat') { ww = s * 1.3; hh = s; cy = sy - (c.alt || 0) * k; }
  return { cx: sx, cy, rx: Math.max(2.2, ww), ry: Math.max(2.2, hh) };
};
BB.drawCritter = (g, c, sx, sy, k, v) => {
  const d = c.def, s = d.size * (c.scale || 1) * k, f = c.face, t = E.tones(d.col);
  const alt = (c.alt || 0) * k;
  if (!c.dead && d.shape !== 'clay' && d.shape !== 'ball' && c.alt !== undefined) px.blend(g, .28, 'normal', () => px.ell(g, sx, sy, s * .6, Math.max(1, s * .12), '#000'));
  let fade = 1; if (c.dead && c.deadT > 1.2) fade = clamp(1 - (c.deadT - 1.2) / .6, 0, 1);
  const body = () => {
    switch (d.shape) {
      case 'rodent': case 'raccoon': case 'skunk': case 'beaver': {
        const y = sy - alt - s * .45; if (d.motion === 'peek') { const h = c.pop * s; px.ell(g, sx, sy - h * .5, s * .45, Math.max(1, h * .6), t.base); px.disc(g, sx, sy - h, s * .3, t.lt); px.dot(g, sx - 1, sy - h, '#000'); if (d.shape === 'raccoon') px.rect(g, sx - s * .28, sy - h - s * .05, s * .56, Math.max(1, s * .12), '#222'); break; }
        px.ell(g, sx, y, s * .5, s * .32, t.base); px.disc(g, sx + f * s * .45, y - s * .1, s * .24, t.lt); px.dot(g, sx + f * s * .55, y - s * .15, '#000');
        if (d.shape === 'skunk') { px.rect(g, sx - s * .4, y - s * .3, s * .8, Math.max(1, s * .1), '#f4f4f4'); px.ell(g, sx - f * s * .6, y - s * .25, s * .4, s * .3, '#f4f4f4'); }
        else if (d.tail) px.ell(g, sx - f * s * .6, y - s * .3, s * .3, s * .45, t.sh);
        else if (d.shape === 'raccoon') { px.ell(g, sx - f * s * .6, y - s * .1, s * .35, s * .18, '#555'); px.rect(g, sx + f * s * .35, y - s * .22, s * .3, Math.max(1, s * .1), '#222'); }
        else if (d.shape === 'beaver') { px.ell(g, sx - f * s * .7, y + s * .05, s * .4, s * .12, '#3a2a1a'); }
        break; }
      case 'rabbit': { const y = sy - alt - s * .4; px.ell(g, sx, y, s * .5, s * .38, t.base); px.disc(g, sx + f * s * .42, y - s * .22, s * .24, t.lt); px.line(g, sx + f * s * .4, y - s * .35, sx + f * s * .35, y - s * .85, t.base, Math.max(1, s * .12)); px.disc(g, sx - f * s * .5, y - s * .05, Math.max(1, s * .14), '#fff'); break; }
      case 'turkey': { const y = sy - s * .62; px.ell(g, sx, y, s * .62, s * .5, t.base); px.ell(g, sx - f * s * .3, y - s * .2, s * .55, s * .55, t.sh); px.line(g, sx + f * s * .35, y - s * .2, sx + f * s * .5, y - s * .9, t.lt, Math.max(1, s * .13)); px.disc(g, sx + f * s * .52, y - s * .95, s * .13, '#c0392b'); px.line(g, sx, y + s * .4, sx, sy, '#c9a46a', 1); px.line(g, sx + s * .2, y + s * .4, sx + s * .2, sy, '#c9a46a', 1); break; }
      case 'canid': { const j = { L: 1.2 }; const aa = { species: 'canid', sex: 'female', age: 'adult', face: f, phase: c.t * 6, gait: 'trot', pose: 'trot', mode: 'walk' }; aa.dead = c.dead; aa.deadT = c.deadT; BB.drawAnimal(g, aa, sx, sy, k, v, { scale: d.size * 2.1 * (c.scale || 1) }); break; }
      case 'cow': { const aa = { species: 'cow', sex: 'female', age: 'adult', face: f, phase: c.t * 1.5, gait: 'walk', pose: c.t % 7 < 4 ? 'graze' : 'stand', mode: 'walk', dead: c.dead, deadT: c.deadT }; BB.drawAnimal(g, aa, sx, sy, k, v, { scale: 1.15 }); const hx = sx, hy = sy - k * 1.6; px.rect(g, sx - f * k * .6 - 3, sy - k * 1.1, 3, 3, '#d9b84a'); break; }
      case 'bird': case 'eagle': { const w = s * (d.shape === 'eagle' ? 1.8 : 1), y = sy - alt, fl = Math.sin(c.t * (c.mode === 'perched' ? 0 : 14) + c.seed) * (c.mode === 'perched' ? 0 : 1); px.ell(g, sx, y, w * .55, s * .22, t.base); px.disc(g, sx + f * w * .5, y - s * .06, s * .17, t.lt); px.rect(g, sx + f * w * .65, y - s * .06, Math.max(1, s * .14), Math.max(1, s * .06), '#e8b030'); if (c.golden) px.blend(g, .5, 'add', () => px.disc(g, sx, y, s * .7, '#ffd24a'));
        px.poly(g, [[sx - w * .1, y], [sx - w * .55 * f, y - w * (.5 + fl * .45)], [sx + w * .3 * f, y - s * .02]], t.sh); px.poly(g, [[sx + w * .05, y], [sx + w * .6 * f, y - w * (.4 + fl * .4)], [sx - w * .25 * f, y - s * .02]], t.base); break; }
      case 'loon': { const y = sy - s * .15; px.ell(g, sx, y, s * .7, s * .22, t.base); px.line(g, sx + f * s * .5, y, sx + f * s * .6, y - s * .55, t.base, Math.max(1, s * .12)); px.disc(g, sx + f * s * .6, y - s * .6, s * .14, t.lt); px.rect(g, sx + f * s * .7, y - s * .62, Math.max(1, s * .2), Math.max(1, s * .06), '#ddd'); px.rect(g, sx - s * .3, y - s * .1, s * .5, Math.max(1, s * .06), '#e8e8e8'); px.blend(g, .5, 'normal', () => px.ell(g, sx, sy, s * .9, Math.max(1, s * .08), '#cfe6ee')); break; }
      case 'clay': { const y = sy - alt; px.ell(g, sx, y, s * .75, s * .2, c.golden ? '#f2c83a' : '#e8742a'); px.ell(g, sx, y - s * .06, s * .5, s * .11, c.golden ? '#fff1a0' : '#ff9a4a'); break; }
      case 'ball': { const y = sy - alt; px.disc(g, sx, y, Math.max(1.5, s * .8), '#ffffff'); px.disc(g, sx - 1, y - 1, Math.max(1, s * .45), '#e0ecf4'); break; }
      case 'hat': { const y = sy - alt; px.rect(g, sx - s * .7, y - s * .1, s * 1.4, Math.max(1, s * .16), '#2a2634'); px.rect(g, sx - s * .42, y - s * .65, s * .84, s * .6, '#2a2634'); break; }
      case 'bigmoose': { const aa = { species: 'moose', sex: 'male', age: 'adult', pts: 50, face: f, phase: 0, gait: 'stand', pose: 'alert', mode: 'stand' }; BB.drawAnimal(g, aa, sx, sy, k, v, { scale: 1.7 }); px.rect(g, sx + f * k * 2.2 - k * .5, sy - k * 4.2, k * 1.4, k * .2, '#2a2634'); px.rect(g, sx + f * k * 2.2 - k * .3, sy - k * 5.1, k * 1.0, k * .95, '#2a2634'); break; }
    }
  };
  if (fade < 1) px.blend(g, fade, 'normal', body); else body();
  if (c.dead && d.shape !== 'bigmoose' && d.shape !== 'cow') { /* puff */ }
};
})();
