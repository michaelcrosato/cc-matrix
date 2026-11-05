# Applies the Gauntletdown engine changes (E2: Humanoid gear) to my-3d2dge.js. Idempotent.
import sys, io
p = sys.argv[1]
s = io.open(p, encoding='utf8').read()
if 'GAUNTLETDOWN-E2' in s:
    print('already patched'); sys.exit(0)
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit('pattern count %d != %d: %r' % (n, count, old[:80]))
    s = s.replace(old, new)
# 1. accept the new weapons
rep("if (this.o.weapon && !['sword', 'gun', 'staff'].includes(this.o.weapon))",
    "if (this.o.weapon && !['sword', 'gun', 'staff', 'axe', 'bow', 'club', 'pan', 'scythe', 'fork'].includes(this.o.weapon))")
# 2. tip lengths
rep("tip() { const J = this.J, L = this.o.weapon === 'gun' ? 5 : this.o.weapon === 'staff' ? 10 : this.o.bladeLen,",
    "tip() { const J = this.J, L = this.o.weapon === 'gun' ? 5 : this.o.weapon === 'staff' ? 10 : GEAR_LEN[this.o.weapon] || this.o.bladeLen,")
# 3. rest pose for long-hafted gear and the bow
rep("rest = V3.norm(wp === 'staff' ? [.3, .15, 1] :",
    "rest = V3.norm(wp === 'staff' || wp === 'scythe' || wp === 'fork' ? [.3, .15, 1] : wp === 'bow' ? [.7, 0, .2] :")
# 4. draw the gear in the HD path, after the sword
rep("""    ops.sort((a, b) => a.d - b.d);
    for (const op of ops) op.f();
  }
  /** classic style: thin stick limbs (cheapest; good for huge crowds) */""",
"""    // GAUNTLETDOWN-E2: more hand-held gear (axe, bow, club, pan, scythe, fork) and an off-hand shield
    if (GEAR_LEN[o.weapon] || o.offhand) this._gear(g, Sp, J, Q, cap, u, ops, C);
    ops.sort((a, b) => a.d - b.d);
    for (const op of ops) op.f();
  }
  _gear(g, Sp, J, Q, cap, u, ops, C) {
    const o = this.o, hd = J.handR, bd = J.bladeDir, Hn = Q.handR, m = tones(C.metal), w = tones(C.staff || '#7a4a26');
    const along = (k, side = 0, up = 0) => { const sl = Math.hypot(bd[0], bd[1]) || 1, sx = -bd[1] / sl, sy = bd[0] / sl; return Sp(hd, bd[0] * k + sx * side, bd[1] * k + sy * side, bd[2] * k + up); };
    const perp = (k, a, b) => { const sl = Math.hypot(bd[0], bd[1]), nz = sl; const fx = sl > .2 ? -bd[0] * bd[2] / sl : 1, fy = sl > .2 ? -bd[1] * bd[2] / sl : 0; return Sp(hd, bd[0] * k + fx * a, bd[1] * k + fy * a, bd[2] * k + nz * a + b); };
    const wp = o.weapon;
    if (wp === 'axe' || wp === 'club' || wp === 'pan' || wp === 'scythe' || wp === 'fork') {
      const L = GEAR_LEN[wp], top = along(L), bot = along(wp === 'scythe' || wp === 'fork' ? -6 : -1.5);
      ops.push({ d: (Hn[2] + top[2]) / 2 + .01, f: () => {
        const hw = wp === 'club' ? 0 : .5;
        if (wp === 'club') { const mid = along(L * .45); cap(bot, mid, .55 * u, .9 * u, w.sh); cap(mid, top, .9 * u, 1.5 * u, w.sh); cap(mid, top, .5 * u, 1.05 * u, w.base, -.5, -.5); for (const k of [.6, .8, .95]) { const q = along(L * k, (k - .78) * 3); px.dot(g, q[0], q[1], '#d8d0c0'); } return; }
        cap(bot, top, hw * u + .3, hw * u + .3, w.sh); px.line(g, bot[0] - .5, bot[1] - .5, top[0] - .5, top[1] - .5, w.lt);
        if (wp === 'axe') { const a = perp(L - .6, 0, 0), b = perp(L - 3.4, 3.2, 0), c2 = perp(L + 1.4, 3.6, 0), d = perp(L + 1.6, .2, 0); px.poly(g, [a, b, c2, d], m.sh); px.poly(g, [perp(L - .3, .6, 0), perp(L - 2.4, 2.8, 0), perp(L + .9, 3.1, 0), perp(L + 1, .7, 0)], m.base); px.line(g, b[0], b[1], c2[0], c2[1], m.hi); }
        else if (wp === 'pan') { const c0 = along(L + 2.6); px.disc(g, c0[0], c0[1], Math.max(1.5, 2.9 * u), '#1e1a1a'); px.disc(g, c0[0] - .5, c0[1] - .5, Math.max(1, 2.2 * u), '#3e3838'); px.dot(g, c0[0] - u, c0[1] - u, '#9a9090'); }
        else if (wp === 'scythe') { const pts = [top, perp(L - .5, 2.5, 0), perp(L - 2.5, 5.5, -1), perp(L - 5.5, 7, -3)]; for (let i = 0; i < 3; i++) px.line(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], m.base, 2); for (let i = 0; i < 3; i++) px.line(g, pts[i][0], pts[i][1] - 1, pts[i + 1][0], pts[i + 1][1] - 1, m.hi); }
        else if (wp === 'fork') { const bar0 = perp(L, -2.2, 0), bar1 = perp(L, 2.2, 0); px.line(g, bar0[0], bar0[1], bar1[0], bar1[1], m.sh, 2); for (const k of [-2, 0, 2]) { const p0 = perp(L, k, 0), p1 = perp(L + 5, k, 0); px.line(g, p0[0], p0[1], p1[0], p1[1], m.base, Math.max(1, Math.round(u * .6))); px.dot(g, p1[0], p1[1], m.hi); } }
      } });
    }
    if (wp === 'bow') {   // held in the left hand, upright, the string drawn to the right hand
      const hl = J.handL, HL = Q.handL, pts = [];
      for (let i = -4; i <= 4; i++) { const t = i / 4; pts.push(Sp(hl, 1.6 * (1 - t * t), 0, t * 7)); }
      ops.push({ d: HL[2] + .02, f: () => {
        for (let i = 0; i < pts.length - 1; i++) { px.line(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w.sh, 2); px.line(g, pts[i][0] - .5, pts[i][1] - .5, pts[i + 1][0] - .5, pts[i + 1][1] - .5, w.lt); }
        const a = pts[0], b = pts[pts.length - 1], drawn = Math.hypot(Hn[0] - HL[0], Hn[1] - HL[1]) < 9 * u + 4 ? Hn : null;
        if (drawn) { px.line(g, a[0], a[1], drawn[0], drawn[1], '#e8e0c8'); px.line(g, drawn[0], drawn[1], b[0], b[1], '#e8e0c8'); }
        else px.line(g, a[0], a[1], b[0], b[1], '#e8e0c8');
      } });
    }
    if (o.offhand === 'shield') {   // a round shield on the left forearm, its face turned forward
      const hl = J.handL, HL = Q.handL, R = 3.6, ring = [], inner = [];
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ring.push(Sp(hl, 1.2, Math.cos(a) * R, Math.sin(a) * R + .6)); inner.push(Sp(hl, 1.3, Math.cos(a) * R * .72, Math.sin(a) * R * .72 + .6)); }
      const boss = Sp(hl, 1.6, 0, .6), face = tones(C.shield || '#3a6ab0'), rim = tones(C.metal);
      ops.push({ d: HL[2] + .06, f: () => { px.poly(g, ring, rim.sh); px.poly(g, inner, face.base); px.line(g, inner[3][0], inner[3][1], inner[9][0], inner[9][1], face.lt); px.disc(g, boss[0], boss[1], Math.max(1, u * .9), rim.hi); } });
    }
  }
  /** classic style: thin stick limbs (cheapest; good for huge crowds) */""")
# 5. the horned helmet
rep("""    } else if (st === 'crown') {
      for (const k of [-1, 0, 1])""",
"""    } else if (st === 'horned') {  // GAUNTLETDOWN-E2: a helmet with two curling horns
      const t = Sp(J.head, -.8, 0, .6), f = Sp(J.head, R * .75, 0, -.2), hc = h.horn || '#efe4c8';
      px.disc(g, t[0], t[1], r * 1.02, c); px.disc(g, f[0], f[1], r * .55, this.C.skin);
      for (const sd of [-1, 1]) { const a = Sp(J.head, 0, sd * R * .85, R * .45), b = Sp(J.head, .3, sd * R * 1.6, R * .9), e = Sp(J.head, .9, sd * R * 1.75, R * 1.75); px.line(g, a[0], a[1], b[0], b[1], hc, 2); px.line(g, b[0], b[1], e[0], e[1], hc); px.dot(g, e[0], e[1], '#ffffff'); }
    } else if (st === 'toque') {   // a tall cook's hat
      for (let k = 0; k < 5; k++) { const p = Sp(J.head, -.3, 0, R * (.5 + k * .38)); px.disc(g, p[0], p[1], r * (k > 2 ? 1.02 : .9), k === 4 ? '#ffffff' : '#ecebe6'); }
    } else if (st === 'crown') {
      for (const k of [-1, 0, 1])""")
# 6. the gear table
rep("/** classic style: thin stick limbs", "/** classic style: thin stick limbs", 1)
idx = s.index('class Humanoid')
s = s[:idx] + "const GEAR_LEN = { axe: 9, bow: 6, club: 9, pan: 5, scythe: 14, fork: 14 };   // GAUNTLETDOWN-E2: hand-to-tip lengths\n" + s[idx:]
io.open(p, 'w', encoding='utf8').write(s)
print('patched')
