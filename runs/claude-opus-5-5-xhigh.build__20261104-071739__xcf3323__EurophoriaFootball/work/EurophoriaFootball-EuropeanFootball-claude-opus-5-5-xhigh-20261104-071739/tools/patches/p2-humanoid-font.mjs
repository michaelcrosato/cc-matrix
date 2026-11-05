export const patches = [
['kit pattern',
"      px.poly(g, inset(plate, 1.1), t.base); cap(core0, core1, Math.max(.5, o.torsoW * .62 * u - .9), Math.max(.5, o.torsoW * .72 * u - .9), t.base, -.6, -.6);\n      if (facingCam) { const n0",
"      px.poly(g, inset(plate, 1.1), t.base); cap(core0, core1, Math.max(.5, o.torsoW * .62 * u - .9), Math.max(.5, o.torsoW * .72 * u - .9), t.base, -.6, -.6);\n" +
"      // EF: a football kit: o.kit = { pattern: 'hoops' | 'stripes' | 'halves' | 'sash' | 'plain', color2, number, numberColor }, drawn over the shirt's plate\n" +
"      const K = o.kit; if (K && K.color2 && K.pattern && K.pattern !== 'plain') {\n" +
"        const t2 = tones(K.color2), L2 = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], band = q => { px.poly(g, q, t2.base); };\n" +
"        if (K.pattern === 'hoops') for (const [f0, f1] of [[.18, .34], [.48, .64], [.78, .94]]) band([L2(shL, hL, f0), L2(shR, hR, f0), L2(shR, hR, f1), L2(shL, hL, f1)]);\n" +
"        else if (K.pattern === 'stripes') for (const [f0, f1] of [[.1, .3], [.4, .6], [.7, .9]]) band([L2(shL, shR, f0), L2(shL, shR, f1), L2(hL, hR, f1), L2(hL, hR, f0)]);\n" +
"        else if (K.pattern === 'halves') band([shL, L2(shL, shR, .5), L2(hL, hR, .5), hL]);\n" +
"        else if (K.pattern === 'sash') band([shL, L2(shL, shR, .34), hR, L2(hR, hL, .34)]);\n" +
"      }\n" +
"      if (K && K.number && !facingCam && Math.abs(hL[1] - shL[1]) >= 6) { const c = lq(core0, core1, .5); E.font.text(g, String(K.number), Math.round(c[0]), Math.round(c[1]) - 2, K.numberColor || '#ffffff', { font: 'tiny', outline: false, align: 'center' }); }\n" +
"      if (facingCam) { const n0"],
['tilt call',
"    if (s.flip > 0 && s.flip < 1) this._roll(s.flip);\n",
"    if (s.flip > 0 && s.flip < 1) this._roll(s.flip);\n    if (s.tilt && (s.tilt.angle || s.tilt.lift)) this._tilt(s.tilt);   // EF: a whole-body tilt (dives, headers, bicycle kicks, tumbles)\n"],
['tilt clear',
"    const un = this._unroll; if (un) { this._unroll = null; for (let i = 0; i < un.length; i += 4) { un[i].x = un[i + 1]; un[i].y = un[i + 2]; un[i].z = un[i + 3]; } }   // last step's roll turned the cloth for drawing only\n    if (this.t > 0",
"    const un = this._unroll; if (un) { this._unroll = null; for (let i = 0; i < un.length; i += 4) { un[i].x = un[i + 1]; un[i].y = un[i + 2]; un[i].z = un[i + 3]; } }   // last step's roll turned the cloth for drawing only\n    if (this._tiltOn) { this._tiltOn = false; this.mocapTilt = null; }   // EF: last step's tilt turned the face and hair frames\n    if (this.t > 0"],
['tilt method',
"  /** world position of a hand ('R' holds the weapon): spawn bullets, sparks or thrown things here */",
"  /** EF: tilt the whole body after posing: t = { axis: 'forward' (a sideways fall: + goes to its right) | 'right' (pitching:\n" +
"   *  + goes face first), angle (radians), pivot: 'feet' | 'hips', lift }. It keeps every joint above the floor (as the roll\n" +
"   *  does), turns the face and hair frames with it (mocapTilt) and moves the cloth for this step's drawing only */\n" +
"  _tilt(t) {\n" +
"    const J = this.J, o = this.o, a = t.angle || 0, c = Math.cos(a), s = Math.sin(a), pz = t.pivot === 'hips' ? o.hipZ * .9 : 0, side = t.axis === 'forward';\n" +
"    const R = side ? p => { const z = p[2] - pz; return [p[0], p[1] * c + z * s, -p[1] * s + z * c + pz]; } : p => { const z = p[2] - pz; return [p[0] * c + z * s, p[1], -p[0] * s + z * c + pz]; };\n" +
"    let lift = -1e9; for (const k in J) { const p = J[k]; if (p && k !== 'bladeDir') lift = Math.max(lift, -R(p)[2] + (k === 'head' ? o.headR * .9 : .4)); }\n" +
"    lift = Math.max(0, lift) + (t.lift || 0);\n" +
"    const T = p => { const q = R(p); q[2] += lift; return q; };\n" +
"    for (const k in J) { const p = J[k]; if (p && k !== 'bladeDir') J[k] = T(p); }\n" +
"    const b = J.bladeDir; if (b) J.bladeDir = R([b[0], b[1], b[2] + pz]).map((v, i) => i === 2 ? v - pz : v);\n" +
"    const M = side ? [1, 0, 0, 0, c, s, 0, -s, c] : [c, 0, s, 0, 1, 0, -s, 0, c];\n" +
"    const mul = (A, B) => { const out = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) out[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]; return out; };\n" +
"    const was = this.mocapTilt; this.mocapTilt = was ? { body: mul(M, was.body), head: mul(M, was.head) } : { body: M, head: M }; this._tiltOn = true;\n" +
"    const an = this.facing + this.spin + this._cheat, ca = Math.cos(an), sa = Math.sin(an), k = (1 - this.sq * .4) * o.size, kz = (1 + this.sq) * o.size, keep = this._unroll || (this._unroll = []);\n" +
"    for (const ch of [this.capeL, this.capeR, this._hairPts]) if (ch) for (const n of ch) {\n" +
"      keep.push(n, n.x, n.y, n.z);\n" +
"      const dx = n.x - this.x, dy = n.y - this.y, q = T([(dx * ca + dy * sa) / k, (-dx * sa + dy * ca) / k, (n.z - this.z) / kz]);\n" +
"      n.x = this.x + (q[0] * ca - q[1] * sa) * k; n.y = this.y + (q[0] * sa + q[1] * ca) * k; n.z = this.z + q[2] * kz;\n" +
"    }\n" +
"  }\n" +
"  /** world position of a hand ('R' holds the weapon): spawn bullets, sparks or thrown things here */"],
['font accents',
"  \"×\": '.....|#...#|.#.#.|..#..|.#.#.|#...#|.....',",
"  // EF: accented letters (names and chants: OLÉ, JÜRGEN, ESTADIO); capitals squeeze into six rows under the mark\n" +
"  \"É\": '...#.|#####|#....|####.|#....|#....|#####', \"È\": '.#...|#####|#....|####.|#....|#....|#####', \"Á\": '...#.|.###.|#...#|#####|#...#|#...#|#...#', \"Ó\": '...#.|.###.|#...#|#...#|#...#|#...#|.###.',\n" +
"  \"Ü\": '.#.#.|.....|#...#|#...#|#...#|#...#|.###.', \"Ö\": '.#.#.|.###.|#...#|#...#|#...#|#...#|.###.', \"Ä\": '.#.#.|.###.|#...#|#####|#...#|#...#|#...#', \"Ñ\": '.####|.....|##..#|#.#.#|#..##|#...#|#...#',\n" +
"  \"Ç\": '.###.|#...#|#....|#....|#...#|.###.|..#..|.##..', \"é\": '...#.|..#..|.###.|#...#|#####|#....|.###.', \"è\": '.#...|..#..|.###.|#...#|#####|#....|.###.', \"á\": '...#.|..#..|.###.|....#|.####|#...#|.####',\n" +
"  \"ó\": '...#.|..#..|.###.|#...#|#...#|#...#|.###.', \"ü\": '.....|.#.#.|.....|#...#|#...#|#...#|.####', \"ö\": '.....|.#.#.|.....|.###.|#...#|#...#|.###.', \"ä\": '.....|.#.#.|.....|.###.|...##|#...#|.####',\n" +
"  \"ñ\": '.....|.####|.....|####.|#...#|#...#|#...#', \"ç\": '.....|.....|.###.|#....|#....|.###.|..#..|.##..',\n" +
"  \"×\": '.....|#...#|.#.#.|..#..|.#.#.|#...#|.....',"]
];
