# AOA engine patch 5, drawing: swimsuits (cuts, patterns), patterned shirts, hair styles, hats, the extras hook, sandals
import sys
p = sys.argv[1]; s = open(p).read()
def rep(old, new, cnt=1):
    global s
    n = s.count(old)
    assert n == cnt, (n, old[:100])
    s = s.replace(old, new)

# the per-pixel torso fill, before the class
rep("class Humanoid {\n  /** new E.Humanoid({ size: 1.3,",
r"""/* AOA: which part of a swimsuit a torso pixel is: 0 the suit, 1 skin, 2 trim, 3 accent (u: shoulders 0 to hips 1; v: -1..1 across;
 * front: the chest faces the camera; wide: the torso is seen wide enough for v to mean something) */
function swimRegion(cut, u, v, front, wide) {
  const av = Math.abs(v), strap = av > .4 && av < .74;
  switch (cut) {
    case 'onepiece': case 'sarong': if (u < .13) return strap || (!front && wide && av < .2) ? 0 : 1; if (front && wide && u < .3 && av < .46 - (u - .13) * 1.8) return 1; return 0;
    case 'racer': if (u < .13) return front ? (strap ? 0 : 1) : (av < .32 ? 0 : 1); if (front && wide && u < .27 && av < .4 - (u - .13) * 1.8) return 1; if (wide && av > .72 && u < .9) return 3; if (!front && wide && u < .6 && av > .34 && av < .5) return 1; return 0;
    case 'halter': if (u < .13) return front && av < .22 ? 2 : 1; if (front && wide && u < .29 && av < .3) return 1; return 0;
    case 'sport2': if (u < .12) return strap ? 0 : 1; if (u < .55) return u > .5 && wide ? 2 : 0; if (u < .87) return 1; return 0;
    case 'tankini': if (u < .12) return strap ? 0 : 1; if (u < .79) return u > .74 && wide ? 2 : 0; if (u < .87) return 1; return 0;
    case 'rash': if (front && wide && av < .09 && u < .92) return 2; if (u < .08 && front && wide && av < .3) return 2; return 0;
    case 'shirt': if (front && wide && u < .22 && av < .16 - u * .3) return 1; if (front && wide && av < .07) return 2; return 0;
  }
  return 0;
}
function aoaFillTorso(g, rig, plate, c0, c1, ra, rb, A0, A1, lat, front, cut, pattern, cols, ox, oy) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const q of plate) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
  const rr = Math.max(ra, rb);
  x0 = Math.floor(Math.min(x0, c0[0] - rr, c1[0] - rr)); y0 = Math.floor(Math.min(y0, c0[1] - rr, c1[1] - rr)); x1 = Math.ceil(Math.max(x1, c0[0] + rr, c1[0] + rr)); y1 = Math.ceil(Math.max(y1, c0[1] + rr, c1[1] + rr));
  const W = x1 - x0 + 3, H = y1 - y0 + 3; if (W <= 0 || H <= 0 || W * H > 40000) return;
  const M = new Uint8Array(W * H), n = plate.length, cx = c1[0] - c0[0], cy = c1[1] - c0[1], cl = cx * cx + cy * cy || 1;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const X = x0 - 1 + i + .5, Y = y0 - 1 + j + .5;
    let ins = false;
    for (let a = 0, b = n - 1; a < n; b = a++) { const A = plate[a], B = plate[b]; if ((A[1] > Y) !== (B[1] > Y) && X < (B[0] - A[0]) * (Y - A[1]) / (B[1] - A[1]) + A[0]) ins = !ins; }
    if (!ins) { const k = clamp(((X - c0[0]) * cx + (Y - c0[1]) * cy) / cl, 0, 1), r = ra + (rb - ra) * k, dx = X - (c0[0] + cx * k), dy = Y - (c0[1] + cy * k); ins = dx * dx + dy * dy <= r * r; }
    M[j * W + i] = ins ? 1 : 0;
  }
  const ax = A1[0] - A0[0], ay = A1[1] - A0[1], al = ax * ax + ay * ay || 1, lw = Math.hypot(lat[0], lat[1]), wide = lw > 2.2, lx = wide ? lat[0] / lw : 0, ly = wide ? lat[1] / lw : 0, half = Math.max(1, lw / 2);
  const T = cols.T, t = rig.t;
  for (let j = 1; j < H - 1; j++) {
    let run = 0, runC = null, runX = 0;
    const flush = () => { if (runC) { px.col(g, runC); g.fillRect(runX, y0 - 1 + j, run, 1); } run = 0; runC = null; };
    for (let i = 1; i < W - 1; i++) {
      const at = j * W + i;
      if (!M[at]) { flush(); continue; }
      const X = x0 - 1 + i, Y = y0 - 1 + j, u = clamp(((X + .5 - A0[0]) * ax + (Y + .5 - A0[1]) * ay) / al, 0, 1);
      const mx = A0[0] + ax * u, my = A0[1] + ay * u, v = wide ? clamp(((X + .5 - mx) * lx + (Y + .5 - my) * ly) / half, -1.4, 1.4) : 0;
      const reg = swimRegion(cut, u, v, front, wide);
      let tn;
      if (reg === 1) tn = T.skin; else if (reg === 2) tn = T.trim; else if (reg === 3) tn = T.accent;
      else { const k = pattern(X - ox, Y - oy, u, t); tn = k === 1 ? T.accent : k === 2 ? T.trim : k === 3 ? T.mix : k === 4 ? T.glint : T.main; }
      const r = !M[at + 1] || !M[at + W], l = !M[at - 1] || !M[at - W];
      const c = r ? tn.sh : l ? tn.lt : tn.base;
      if (c !== runC) { flush(); runC = c; runX = X; }
      run++;
    }
    flush();
  }
}
class Humanoid {
  /** new E.Humanoid({ size: 1.3,""")

# set up the swimsuit at the top of _drawHD
rep("    const W = s => (s > 0 ? 1 : -1);\n    // ---- legs and boots ----",
    """    const W = s => (s > 0 ? 1 : -1);
    // AOA: a swimsuit (o.outfit 'swim', o.swim { cut, pattern, colors: { main, accent, trim }, brief }) or a patterned shirt (o.pattern)
    const SWo = o.outfit === 'swim' && o.swim, SWc = SWo ? (SWo.colors || {}) : null;
    const SW = SWo ? { cut: SWo.cut || 'onepiece', main: SWc.main || C.cloth, accent: SWc.accent || C.trim || C.cloth, trim: SWc.trim || '#ffffff', pat: SWo.pattern || 'solid' } : o.pattern && o.outfit === 'shirt' ? { cut: 'shirt', main: C.cloth, accent: C.pattern || C.trim || C.clothLt, trim: C.trim || C.clothLt, pat: o.pattern, shirt: true } : null;
    if (SW) { SW.leg = SW.shirt ? 0 : SW.cut === 'rash' ? .45 : SW.cut === 'tankini' ? .3 : SW.cut === 'sport2' && !SWo.brief ? .35 : .16; SW.legC = SW.cut === 'rash' ? SW.accent : SW.main; }
    // ---- legs and boots ----""")
rep("""      limb(hip, knee, 1.45 * u * lw, 1.2 * u * lw, C.pants, far);
      limb(knee, ank, 1.2 * u * lw, 1.05 * u * lw, C.pants, far, .001);""",
    """      if (SW && !SW.shirt) { const mid = lq(hip, knee, SW.leg); limb(hip, mid, 1.55 * u * lw, 1.45 * u * lw, SW.legC, far); limb(mid, knee, 1.4 * u * lw, 1.2 * u * lw, C.skin, far, .0005); limb(knee, ank, 1.2 * u * lw, 1.05 * u * lw, C.skin, far, .001); }   // AOA: bare legs below the suit
      else { limb(hip, knee, 1.45 * u * lw, 1.2 * u * lw, C.pants, far); limb(knee, ank, 1.2 * u * lw, 1.05 * u * lw, C.pants, far, .001); }""")
rep("""      limb(foot, toe, 1.0 * u * lw, .85 * u * lw, C.boot, far, .003);
    }""",
    """      limb(foot, toe, 1.0 * u * lw, .85 * u * lw, C.boot, far, .003);
      if (C.strap) { const a2 = lq(ank, foot, .75), b2 = lq(foot, toe, .55), st = tones(C.strap); ops.push({ d: foot[2] + .004, f: () => px.line(g, a2[0], a2[1], b2[0], b2[1], far ? st.sh : st.base) }); }   // AOA: a sandal's strap over a bare foot
    }""")
# sarong skirt
rep("    if (out === 'tunic' || out === 'robe' || out === 'coat') {\n      const len = out === 'robe' ? hz - .6 : out === 'coat' ? hz * .62 : hz * .42, fl = out === 'robe' ? 1.55 : 1.3, dep = o.torsoW * .7;",
    "    if (out === 'tunic' || out === 'robe' || out === 'coat' || (SW && SW.cut === 'sarong')) {   // AOA: a sarong is a wrap skirt\n      const sar = SW && SW.cut === 'sarong', len = sar ? hz * .58 : out === 'robe' ? hz - .6 : out === 'coat' ? hz * .62 : hz * .42, fl = out === 'robe' ? 1.55 : sar ? 1.25 : 1.3, dep = o.torsoW * .7;")
rep("      const cc = out === 'coat' ? (C.coat || C.cloth) : C.cloth, trim = C.trim || (out === 'coat' ? shade(cc, -.35) : C.belt);",
    "      const cc = sar ? SW.accent : out === 'coat' ? (C.coat || C.cloth) : C.cloth, trim = sar ? SW.trim : C.trim || (out === 'coat' ? shade(cc, -.35) : C.belt);")
# torso: the swimsuit's per-pixel fill
rep("""    else ops.push({ d: dC, f: () => {
      const t = tones(C.cloth), plate = [shL, shR, [wR[0] - .3, wR[1]], hR, hL, [wL[0] + .3, wL[1]]];""",
    """    else if (SW) ops.push({ d: dC, f: () => {   // AOA: swimsuits and patterned shirts, filled pixel by pixel
      const plate = [shL, shR, [wR[0] - .3, wR[1]], hR, hL, [wL[0] + .3, wL[1]]], tc = this._swT || (this._swT = {});
      const key = SW.main + SW.accent + SW.trim + C.skin;
      if (tc.key !== key) { tc.key = key; tc.T = { skin: tones(C.skin), main: tones(SW.main), accent: tones(SW.accent), trim: tones(SW.trim), mix: tones(mix(SW.main, SW.accent, .5)), glint: tones('#fffbe0') }; }
      aoaFillTorso(g, this, plate, core0, core1, o.torsoW * .62 * u, o.torsoW * .72 * u, Q.shC, Q.hipC, [shR[0] - shL[0], shR[1] - shL[1]], facingCam, SW.cut, SWIM_PATTERNS[SW.pat] || SWIM_PATTERNS.solid, tc, Math.round(Q.hipC[0]), Math.round(Q.hipC[1]));
      if (SW.cut === 'halter' && facingCam) { const n0 = Sp(J.shC, .4, 0, .9), a0 = Sp(J.shC, .9, -o.shoulderHalf * .45, -1.2), b0 = Sp(J.shC, .9, o.shoulderHalf * .45, -1.2), tt = tones(SW.trim); px.line(g, n0[0], n0[1], a0[0], a0[1], tt.base); px.line(g, n0[0], n0[1], b0[0], b0[1], tt.base); }
    } });
    else ops.push({ d: dC, f: () => {
      const t = tones(C.cloth), plate = [shL, shR, [wR[0] - .3, wR[1]], hR, hL, [wL[0] + .3, wL[1]]];""")
# hair styles: the extra shapes, behind the face and in front of it
rep("""      const bald = hs === 'bald', hairBehind = back[2] < H[2];
      if (!bald && hairBehind) disc2(back, r * .98, ht, false);
      disc2(H, r * .9, st, false);""",
    """      const bald = hs === 'bald', hairBehind = back[2] < H[2];
      const XH = bald ? [] : aoaHairShapes(hs, Sp, J, R, r), drawXH = e => { const tt = e.c ? tones(e.c) : ht; if (e.line) { px.line(g, e.P[0], e.P[1], e.P2[0], e.P2[1], tt.base, e.w || 1); return; } disc2(e.P, e.r, tt, false); if (e.hi && e.r > 1.5) px.dot(g, e.P[0] - e.r * .4, e.P[1] - e.r * .45, tt.lt); };   // AOA: buns, puffs, bobs, curls
      for (const e of XH) if (e.P[2] < H[2] && !e.front) drawXH(e);
      if (!bald && hairBehind) disc2(back, r * .98, ht, false);
      disc2(H, r * .9, st, false);""")
rep("""        px.dot(g, cap[0] - r * .35, cap[1] - r * .45, ht.hi); px.dot(g, cap[0] - r * .1, cap[1] - r * .55, ht.lt);
      }""",
    """        for (const e of XH) if (e.P[2] >= H[2] || e.front) drawXH(e);
        px.dot(g, cap[0] - r * .35, cap[1] - r * .45, ht.hi); px.dot(g, cap[0] - r * .1, cap[1] - r * .55, ht.lt);
      }""")
# braid drawing: alternating widths and a tie
rep("      const P = this._hairPts, x0 = this.x, y0 = this.y, z0 = this.z, ht = tones(C.hair), w0 = (this.o.hair.style === 'ponytail' ? .9 : 1.5) * u;",
    "      const P = this._hairPts, x0 = this.x, y0 = this.y, z0 = this.z, ht = tones(C.hair), braid = this.o.hair.style === 'braid', w0 = (this.o.hair.style === 'ponytail' ? .9 : braid ? 1 : 1.5) * u;")
rep("      for (let i = 0; i < pts.length - 1; i++) { const r0 = w0 * (1 - i / pts.length * .75), r1 = w0 * (1 - (i + 1) / pts.length * .75); ops.push(",
    "      if (braid && pts.length > 1) { const e = pts[pts.length - 1], tt = tones(C.trim || '#e8e0d0'); ops.push({ d: e[2] - .3, f: () => px.disc(g, e[0], e[1], Math.max(.6, u * .55), tt.base) }); }   // AOA: the braid's tie\n      for (let i = 0; i < pts.length - 1; i++) { const bw = braid ? (i % 2 ? .72 : 1.08) : 1, r0 = w0 * bw * (1 - i / pts.length * (braid ? .45 : .75)), r1 = w0 * bw * (1 - (i + 1) / pts.length * (braid ? .45 : .75)); ops.push(")
# extras hook, before the sort
rep("""    ops.sort((a, b) => a.d - b.d);
    for (const op of ops) op.f();
  }
  /** classic style: thin stick limbs (cheapest; good for huge crowds) */""",
    """    if (this.extras && this.extras.length) {   // AOA: accessories drawn at a body anchor, depth sorted with the rest
      const R = o.headR, Hd = Sp(J.head, 0, 0, 0), front = Sp(J.head, R * .9, 0, 0)[2] > Hd[2] + .15;
      const AN = { head: () => Sp(J.head, 0, 0, R * .2), face: () => Sp(J.head, R * .95, 0, R * .05), neck: () => Sp(J.shC, .5, 0, .1), hair: () => Sp(J.head, -R * .3, R * .8, R * .45), wristL: () => lq(Q.elbowL, Q.handL, .78), wristR: () => lq(Q.elbowR, Q.handR, .78) };
      for (const ex of this.extras) { const P = (AN[ex.at] || AN.head)(); ops.push({ d: ex.at === 'face' || ex.at === 'head' ? Q.head[2] + .02 : P[2] + (ex.bias || .02), f: () => ex.draw(g, P, { rig: this, view, u, Sp, J, R, front, H: Hd, Q }) }); }
    }
    ops.sort((a, b) => a.d - b.d);
    for (const op of ops) op.f();
  }
  /** classic style: thin stick limbs (cheapest; good for huge crowds) */""")
# hats: sunhat and visor
rep("""    } else if (st === 'crown') {""",
    """    } else if (st === 'sunhat') {  // AOA: a wide straw brim with a ribbon band
      const t = tones(c), pts = []; for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; pts.push(Sp(J.head, -R * .12 + Math.cos(a) * R * 1.85, Math.sin(a) * R * 1.85, R * .42)); }
      px.poly(g, pts, t.sh); px.poly(g, pts.map(q => [q[0] - .5, q[1] - .6]), t.base);
      const cr = Sp(J.head, -R * .15, 0, R * .78); px.disc(g, cr[0], cr[1], r * .8, t.sh); px.disc(g, cr[0] - .5, cr[1] - .6, Math.max(.5, r * .8 - 1), t.lt);
      const b0 = Sp(J.head, R * .5, -R * .7, R * .55), b1 = Sp(J.head, R * .5, R * .7, R * .55); px.line(g, b0[0], b0[1], b1[0], b1[1], h.band || '#e8504a', Math.max(1, Math.round(r * .3)));
    } else if (st === 'visor') {   // AOA: a sun visor, a brim on a band with no crown
      const a = Sp(J.head, R * .55, -R * .95, R * .4), b = Sp(J.head, R * .55, R * .95, R * .4), k = Sp(J.head, -R * .9, 0, R * .45), f = Sp(J.head, R * .95, 0, R * .42), br = Sp(J.head, R * 1.75, 0, R * .2);
      px.line(g, a[0], a[1], b[0], b[1], c, 2); px.line(g, f[0], f[1], k[0], k[1], c, 1); px.line(g, f[0], f[1], br[0], br[1], h.brim || dk, 2);
    } else if (st === 'crown') {""")
# the hair shapes helper, before the class
rep("class Humanoid {\n  /** new E.Humanoid({ size: 1.3,",
r"""/* AOA: the extra hair shapes for a style: [{ P (projected), r, c, hi, front, line, P2, w }] */
function aoaHairShapes(hs, Sp, J, R, r) {
  const L = [];
  if (hs === 'bob' || hs === 'curly') {
    for (const sd of [-1, 1]) L.push({ P: Sp(J.head, -R * .15, sd * R * .8, -R * .32), r: r * .5, hi: true });
    L.push({ P: Sp(J.head, -R * .55, 0, -R * .2), r: r * .78 });
    if (hs === 'curly') for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; L.push({ P: Sp(J.head, -R * .38 + Math.cos(a) * R * .72, Math.sin(a) * R * .92, R * .2 + Math.sin(a * 2) * R * .25), r: r * .3, hi: k % 2 === 0 }); }
  } else if (hs === 'puff') {
    L.push({ P: Sp(J.head, -R * .62, 0, R * .78), r: r * 1.05, hi: true });
    L.push({ line: true, P: Sp(J.head, -R * .05, -R * .9, R * .58), P2: Sp(J.head, -R * .05, R * .9, R * .58), c: '#ffd36a', w: 1, front: true, r: 0 });
  } else if (hs === 'bun') L.push({ P: Sp(J.head, -R * .9, 0, R * .55), r: r * .5, hi: true });
  else if (hs === 'twinbuns') for (const sd of [-1, 1]) { L.push({ P: Sp(J.head, -R * .12, sd * R * .8, R * .78), r: r * .55, hi: true }); L.push({ P: Sp(J.head, -R * .32, sd * R * 1.05, R * .05), r: r * .28 }); }
  return L;
}
class Humanoid {
  /** new E.Humanoid({ size: 1.3,""")
open(p, 'w').write(s)
