# Applies the S7 PATCHes to engine/my-3d2dge.js once (idempotent: skips when already patched).
import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
if 'S7 PATCH' in s: print('already patched'); sys.exit(0)
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n < count: raise SystemExit('patch anchor missing: ' + old[:80])
    s = s.replace(old, new, count)

# 1. hats
rep("""    } else if (st === 'crown') {""", """    } else if (st === 'beanie') {   // S7 PATCH: a knit beanie with a pompom (h.pom), for the ski patrol
      const t = Sp(J.head, -.3, 0, R * .5), pm = Sp(J.head, -.4, 0, R * 1.35);
      px.disc(g, t[0], t[1], r * .95, c); px.disc(g, t[0] - .5, t[1] - .8, Math.max(.5, r * .6), shade(c, .18));
      const rb = Sp(J.head, R * .55, 0, R * .3); px.line(g, rb[0] - r * .7, rb[1], rb[0] + r * .7, rb[1], dk, 2);
      px.disc(g, pm[0], pm[1], Math.max(1, r * .38), h.pom || '#f06a1e');
    } else if (st === 'ushanka') {  // S7 PATCH: a fur hat with ear flaps
      const t = Sp(J.head, -.3, 0, R * .55); px.disc(g, t[0], t[1], r * 1.08, c); px.disc(g, t[0] - .6, t[1] - .9, Math.max(.5, r * .7), shade(c, .2));
      for (const sd of [-1, 1]) { const f = Sp(J.head, -R * .05, sd * R * .95, -R * .35); if (f[2] > H[2] - R * .3) px.disc(g, f[0], f[1], Math.max(1, r * .42), dk); }
    } else if (st === 'felt') {     // S7 PATCH: a Tyrolean felt hat: a brim, a crown, a feather (h.feather) or tuft
      const b0 = Sp(J.head, R * 1.15, 0, R * .55), b1 = Sp(J.head, -R * 1.15, 0, R * .55), b2 = Sp(J.head, 0, -R * 1.15, R * .55), b3 = Sp(J.head, 0, R * 1.15, R * .55);
      px.line(g, b0[0], b0[1], b1[0], b1[1], dk, 2); px.line(g, b2[0], b2[1], b3[0], b3[1], dk, 2);
      const cr = Sp(J.head, -.2, 0, R * 1.0); px.disc(g, cr[0], cr[1], r * .72, c); px.rect(g, cr[0] - r * .7, cr[1] + r * .35, r * 1.4, 1, h.band || '#2a1a10');
      const f0 = Sp(J.head, -R * .2, R * .6, R * 1.0), f1 = Sp(J.head, -R * 1.2, R * .75, R * 1.9); px.line(g, f0[0], f0[1], f1[0], f1[1], h.feather || '#e8e0c0', 1);
    } else if (st === 'beret') {    // S7 PATCH: a flat beret tilted to one side
      const t = Sp(J.head, -.2, R * .25, R * .75); px.ell(g, t[0], t[1], r * 1.05, r * .55, c); px.dot(g, t[0], t[1] - r * .5, dk);
    } else if (st === 'hardhat') {  // S7 PATCH: a hard hat with a brim and a headlamp
      const t = Sp(J.head, -.4, 0, R * .6), b = Sp(J.head, R * 1.1, 0, R * .3), b2 = Sp(J.head, -R * 1.2, 0, R * .3), lp = Sp(J.head, R * .95, 0, R * .6);
      px.disc(g, t[0], t[1], r * .98, c); px.disc(g, t[0] - .6, t[1] - .9, Math.max(.5, r * .55), shade(c, .25)); px.line(g, b[0], b[1], b2[0], b2[1], dk, 2);
      if (lp[2] > H[2]) { px.glow(g, 1); px.disc(g, lp[0], lp[1], Math.max(1, r * .25), '#fff6c0'); }
    } else if (st === 'racehelmet') { // S7 PATCH: a full race helmet with a mirrored visor (h.visor)
      const t = Sp(J.head, -.2, 0, R * .15); px.disc(g, t[0], t[1], r * 1.1, c); px.disc(g, t[0] - .7, t[1] - 1, Math.max(.5, r * .6), shade(c, .3));
      const v0 = Sp(J.head, R * .95, -R * .55, R * .05), v1 = Sp(J.head, R * .95, R * .55, R * .05);
      if ((v0[2] + v1[2]) / 2 > H[2]) { px.line(g, v0[0], v0[1], v1[0], v1[1], h.visor || '#ff8a1e', Math.max(2, Math.round(r * .55))); px.dot(g, (v0[0] + v1[0]) / 2 - 1, (v0[1] + v1[1]) / 2 - 1, '#ffffff'); }
    } else if (st === 'pillbox') {  // S7 PATCH: a bellhop's pillbox cap with a gold band
      const t = Sp(J.head, -.2, 0, R * 1.0); px.rect(g, t[0] - r * .55, t[1] - r * .45, r * 1.1, r * .7, c); px.rect(g, t[0] - r * .55, t[1] + r * .1, r * 1.1, 1, h.band || '#e0b040');
    } else if (st === 'crown') {""")

# 2. accessories, drawn on the face after the eyes and mouth (HD style)
rep("""        if (ex === 'angry' && u > 1.7) for (const sd of [-1, 1]) { const b0 = Sp(J.head, R * .9, sd * R * .15, R * .3), b1 = Sp(J.head, R * .86, sd * R * .55, R * .45); if (b0[2] > H[2]) px.line(g, b0[0], b0[1] - 1, b1[0], b1[1] - 1, ht.deep); }
      }
""", """        if (ex === 'angry' && u > 1.7) for (const sd of [-1, 1]) { const b0 = Sp(J.head, R * .9, sd * R * .15, R * .3), b1 = Sp(J.head, R * .86, sd * R * .55, R * .45); if (b0[2] > H[2]) px.line(g, b0[0], b0[1] - 1, b1[0], b1[1] - 1, ht.deep); }
      }
      if (o.acc) this._acc(g, Sp, J, r, H, u);   // S7 PATCH: accessories on the face (goggles, moustache, beard, shades, cigar)
""")
rep("""  _hat(g, Sp, J, r, H) {""", """  /** S7 PATCH: face accessories, o.acc: a list of { kind, color } (or kind names): goggles (on the forehead), visor,
   *  moustache, beard, shades, cigar (with an ember), badge (on the chest is the game's own) */
  _acc(g, Sp, J, r, H, u) {
    const R = this.o.headR;
    for (const a0 of this.o.acc) {
      const a = typeof a0 === 'string' ? { kind: a0 } : a0, c = a.color || '#202020';
      if (a.kind === 'goggles') { const b0 = Sp(J.head, R * .7, -R * .7, R * .62), b1 = Sp(J.head, R * .7, R * .7, R * .62); if ((b0[2] + b1[2]) / 2 < H[2]) continue; px.line(g, b0[0], b0[1], b1[0], b1[1], '#1a1a1a', 2); for (const sd of [-1, 1]) { const l = Sp(J.head, R * .85, sd * R * .33, R * .62); px.disc(g, l[0], l[1], Math.max(1, r * .26), c); px.dot(g, l[0] - 1, l[1] - 1, '#ffffff'); } }
      else if (a.kind === 'shades') { for (const sd of [-1, 1]) { const l = Sp(J.head, R * .92, sd * R * .36, 0); if (l[2] > H[2] + .1) { px.disc(g, l[0], l[1], Math.max(1, r * .24), c); px.dot(g, l[0] - 1, l[1] - 1, a.shine || '#9aa0b0'); } } }
      else if (a.kind === 'moustache') { const m0 = Sp(J.head, R * .98, -R * .42, -R * .32), m1 = Sp(J.head, R * .98, R * .42, -R * .32), mc = Sp(J.head, R * 1.0, 0, -R * .4); if (mc[2] > H[2]) { px.line(g, m0[0], m0[1] - 1, mc[0], mc[1], c, 2); px.line(g, mc[0], mc[1], m1[0], m1[1] - 1, c, 2); } }
      else if (a.kind === 'beard') { const b = Sp(J.head, R * .75, 0, -R * .78); if (b[2] > H[2] - R * .5) { px.disc(g, b[0], b[1], Math.max(1, r * .55), c); px.disc(g, b[0] - .5, b[1] - .6, Math.max(.5, r * .3), shade(c, .2)); } }
      else if (a.kind === 'cigar') { const c0 = Sp(J.head, R * .95, R * .2, -R * .55), c1 = Sp(J.head, R * 1.6, R * .45, -R * .6); if (c0[2] > H[2] - .2) { px.line(g, c0[0], c0[1], c1[0], c1[1], '#6a4a2a', Math.max(1, Math.round(u * .6))); px.glow(g, 1); px.dot(g, c1[0], c1[1], '#ff7a2a'); } }
      else if (a.kind === 'visor') { const v0 = Sp(J.head, R * .95, -R * .55, R * .05), v1 = Sp(J.head, R * .95, R * .55, R * .05); if ((v0[2] + v1[2]) / 2 > H[2]) px.line(g, v0[0], v0[1], v1[0], v1[1], c, Math.max(2, Math.round(r * .5))); }
    }
  }
  _hat(g, Sp, J, r, H) {""")

# 3. gun-like weapons (HD style): S7_GUNS[kind] = [length, width, held-in-both-hands]
rep("""    // ---- weapons ----
    if (o.weapon === 'gun') {""", """    // ---- weapons ----
    if (S7_GUNS[o.weapon]) {   // S7 PATCH: revolver, pistol, rifle, shotgun, poles, alphorn, camera, launcher: a barrel from the hand
      const [GL, GW, two] = S7_GUNS[o.weapon], bd = J.bladeDir, m = tones(C.metal), wd = tones(C.wood || '#6a4a2a');
      for (const side of two ? [1, -1] : [1]) {
        const hd = side > 0 ? J.handR : J.handL, Hn = side > 0 ? Q.handR : Q.handL, mz = Sp(hd, bd[0] * GL, bd[1] * GL, bd[2] * GL), bk = Sp(hd, -bd[0] * GL * .25, -bd[1] * GL * .25, -bd[2] * GL * .25 - .4);
        ops.push({ d: Hn[2] + .03, f: () => { cap(bk, Hn, GW * .9 * u, GW * .8 * u, o.weapon === 'alphorn' || o.weapon === 'rifle' ? wd.sh : m.deep); cap(Hn, mz, GW * u, GW * .8 * u, o.weapon === 'alphorn' ? wd.base : m.sh); cap(Hn, mz, Math.max(.4, GW * u - .8), Math.max(.4, GW * .8 * u - .8), o.weapon === 'alphorn' ? wd.lt : m.base, -.5, -.5); if (o.weapon === 'alphorn') px.disc(g, mz[0], mz[1], Math.max(1, u * 1.6), wd.base); px.dot(g, mz[0], mz[1], '#ffffff'); } });
      }
    } else if (o.weapon === 'gun') {""")
rep("""class Path {""", """// S7 PATCH: the extra held weapons (length in rig units, width, held one in each hand)
const S7_GUNS = { revolver: [5, .8, 0], pistol: [4, .7, 0], rifle: [11, .7, 0], shotgun: [9, .95, 0], poles: [13, .45, 1], alphorn: [15, .9, 0], camera: [2.5, 1.6, 0], launcher: [9, 1.3, 0] };
class Path {""")

# 4. PlayStation glyphs by default
rep("""glyphs: { group: 'Controller', label: 'Button symbols', type: 'select', value: 'auto',""", """glyphs: { group: 'Controller', label: 'Button symbols', type: 'select', value: 'playstation' /* S7 PATCH: PlayStation by default */,""")

# 5. a pause the game may hold back (AI Hub: Options while Create is held is the hub's)
rep("""    if (s && s.pausable && this.input.pressed('pause')) {""", """    if (s && s.pausable && this.input.pressed('pause') && !(this.pauseBlock && this.pauseBlock()) /* S7 PATCH: game.pauseBlock() holds the pause back */) {""")

# 6. letters the game's names need (Föhn, Grüß Gott, Oberglück, Après, Glühwein)
rep("""const G57 = {
""", """const G57 = {   // S7 PATCH: umlauts, sharp s and accents (the game's names: Föhn, Grüß, Oberglück, Après)
  "Ä": '.#.#.|.###.|#...#|#####|#...#|#...#|#...#', "Ö": '.#.#.|.###.|#...#|#...#|#...#|#...#|.###.', "Ü": '.#.#.|#...#|#...#|#...#|#...#|#...#|.###.', "È": '.#...|#####|#....|####.|#....|#....|#####', "É": '...#.|#####|#....|####.|#....|#....|#####',
  "ä": '.#.#.|.....|.###.|....#|.####|#...#|.####', "ö": '.#.#.|.....|.###.|#...#|#...#|#...#|.###.', "ü": '.#.#.|.....|#...#|#...#|#...#|#...#|.####', "ß": '.##..|#..#.|#.#..|#..#.|#...#|#...#|#.##.', "è": '.#...|..#..|.###.|#...#|#####|#....|.###.', "é": '...#.|..#..|.###.|#...#|#####|#....|.###.', "à": '.#...|..#..|.###.|....#|.####|#...#|.####', "—": '......|......|......|######|......|......|......', "·": '.|.|.|#|.|.|.',
""")

p.write_text(s); print('patched')
