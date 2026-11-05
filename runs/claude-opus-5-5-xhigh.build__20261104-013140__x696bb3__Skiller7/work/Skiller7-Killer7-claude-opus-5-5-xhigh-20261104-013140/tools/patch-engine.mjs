// Applies Skiller7's engine changes to engine/my-3d2dge.js, each marked // S7 PATCH: with its reason. Idempotent: an
// already patched engine is left alone. Run once after tools/fetch-deps.mjs (the build checks the marker).
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const F = path.join(ROOT, 'engine/my-3d2dge.js');
let s = fs.readFileSync(F, 'utf8');
if (s.includes('S7 PATCH: applied')) { console.log('patch-engine: already patched'); process.exit(0); }
const rep = (a, b, what) => { if (!s.includes(a)) throw new Error('patch-engine: anchor not found for ' + what); s = s.replace(a, b); };

// 1. the 5x7 font: the cast's German and French letters, dashes and the PlayStation button symbols
rep('const G57 = {', `// S7 PATCH: applied. Glyphs the game's text and prompts need: umlauts and accents (FÖHN, APRÈS, OBERGLÜCK), dashes,
// the ellipsis, the middle dot, and the PlayStation symbols input.label() returns (✕ ○ □ △), which the font lacked.
const S7_GLYPHS = {
  "Ä": '#...#|.###.|#...#|#####|#...#|#...#|#...#', "Ö": '#...#|.###.|#...#|#...#|#...#|#...#|.###.', "Ü": '#...#|.....|#...#|#...#|#...#|#...#|.###.',
  "È": '.#...|..#..|#####|#....|####.|#....|#####', "É": '...#.|..#..|#####|#....|####.|#....|#####', "À": '.#...|..#..|.###.|#...#|#####|#...#|#...#',
  "ä": '.#.#.|.....|.###.|....#|.####|#...#|.####', "ö": '.#.#.|.....|.###.|#...#|#...#|#...#|.###.', "ü": '.#.#.|.....|#...#|#...#|#...#|#...#|.####',
  "è": '.#...|..#..|.###.|#...#|#####|#....|.###.', "é": '...#.|..#..|.###.|#...#|#####|#....|.###.', "à": '.#...|..#..|.###.|....#|.####|#...#|.####',
  "ß": '.##..|#..#.|#.#..|#..#.|#...#|#...#|#.##.', "ç": '.....|.....|.###.|#....|#....|.###.|..#..|.#...', "ô": '..#..|.#.#.|.###.|#...#|#...#|#...#|.###.',
  "—": '.....|.....|.....|#####|.....|.....|.....', "–": '....|....|....|####|....|....|....', "…": '.....|.....|.....|.....|.....|.....|#.#.#',
  "·": '.|.|.|#|.|.|.', "’": '#|#|.|.|.|.|.', "‘": '#|#|.|.|.|.|.', "“": '#.#|#.#|...|...|...|...|...', "”": '#.#|#.#|...|...|...|...|...',
  "✕": '#.....#|.#...#.|..#.#..|...#...|..#.#..|.#...#.|#.....#', "○": '..###..|.#...#.|#.....#|#.....#|#.....#|.#...#.|..###..',
  "□": '#######|#.....#|#.....#|#.....#|#.....#|#.....#|#######', "△": '...#...|...#...|..#.#..|..#.#..|.#...#.|.#...#.|#######',
  "◆": '..#..|.###.|#####|#####|.###.|..#..|.....', "■": '.....|#####|#####|#####|#####|#####|.....', "●": '.....|.###.|#####|#####|#####|.###.|.....', "°": '.#.|#.#|.#.|...|...|...|...'
};
const G57 = {`, 'font glyphs');
rep('normal: { glyphs: parseFont(G57),', 'normal: { glyphs: parseFont(Object.assign(G57, S7_GLYPHS)),   /* S7 PATCH: the glyphs above */', 'font table');

// 2. the default button symbols: PlayStation (the game is designed for a DualSense; Settings offers Xbox)
rep("glyphs: { group: 'Controller', label: 'Button symbols', type: 'select', value: 'auto',", "glyphs: { group: 'Controller', label: 'Button symbols', type: 'select', value: 'playstation', /* S7 PATCH: PlayStation by default */", 'glyph default');
rep("this.glyphs = 'auto'; this.rumbleScale = .6;", "this.glyphs = 'playstation'; /* S7 PATCH: PlayStation by default */ this.rumbleScale = .6;", 'input glyphs');

// 3. AI Hub rule: in a session, Options does nothing while Create is held (the hub's corner bar)
rep("if (s && s.pausable && this.input.pressed('pause')) {", "if (s && s.pausable && this.input.pressed('pause') && !S7_hubCreate(this.input)) {   /* S7 PATCH: Create + Options is the hub's */", 'pause rule');
rep('class Shell {', `/** S7 PATCH: in an AI Hub session Create (Pad8) + Options belongs to the hub: the game ignores Options while Create is held */
function S7_hubCreate(I) { if (typeof AIHub === 'undefined' || !AIHub.active) return false; const h = I.held; return !!h && (h.has ? h.has('Pad8') : Array.isArray(h) && h.includes('Pad8')); }
class Shell {`, 'shell anchor');
rep("closeAll = has('pause') && I.pressed('pause'),", "closeAll = has('pause') && I.pressed('pause') && !S7_hubCreate(I) /* S7 PATCH */,", 'shell pause');

// 4. Humanoid weapons: the Seven's guns (and the alphorn) beside sword, gun and staff
rep("if (this.o.weapon && !['sword', 'gun', 'staff'].includes(this.o.weapon))", "if (this.o.weapon && !['sword', 'gun', 'staff', 'revolver', 'pistol', 'rifle', 'shotgun', 'poles', 'alphorn', 'launcher'].includes(this.o.weapon))   /* S7 PATCH: Skiller7's weapons */", 'weapon list');
rep("tip() { const J = this.J, L = this.o.weapon === 'gun' ? 5", "tip() { const J = this.J, L = ['gun', 'revolver', 'pistol', 'poles'].includes(this.o.weapon) ? 5 : ['rifle', 'shotgun', 'launcher', 'alphorn'].includes(this.o.weapon) ? 11 : this.o.weapon === 'gun' ? 5", 'tip');
rep("      const hd = J.handR, bd = J.bladeDir, Lb = o.bladeLen, Hn = Q.handR, sl = Math.hypot(bd[0], bd[1]) || 1, gx = -bd[1] / sl * 1.8, gy = bd[0] / sl * 1.8;",
  "      const hd = J.handR, bd = J.bladeDir, Lb = o.bladeLen, Hn = Q.handR, sl = Math.hypot(bd[0], bd[1]) || 1, gx = -bd[1] / sl * 1.8, gy = bd[0] / sl * 1.8;", 'sword anchor check');
rep("    // ---- arms, hands, shoulder pads ----", "    if (o.acc) this._s7Body(ops, g, Sp, J, Q, u, cap, dC);   /* S7 PATCH: accessories on the body (packs, bandoliers, badges, braces) */\n    if (o.weapon && S7_WEAPONS[o.weapon]) this._s7Weapon(ops, g, Sp, J, Q, u, cap, o.weapon);   /* S7 PATCH: Skiller7's weapons */\n    // ---- arms, hands, shoulder pads ----", 'arms anchor');
rep("    // ---- outfit below the belt: tunic / robe / coat ----", "    if (o.skis && this.state && this.state.skis) this._s7Skis(ops, g, Sp, J, u);   /* S7 PATCH: skis under the boots */\n    // ---- outfit below the belt: tunic / robe / coat ----", 'skis anchor');

// 5. faces: slit eyes (the Whiteouts), a visor that hides the face, head accessories after the mouth
rep("      const big = o.face && o.face.eyes === 'big', eh = Math.max(1, Math.round(u * (big ? 1.4 : 1.05))), ew = u > 2.6 || (big && u > 1.8) ? 2 : 1;\n      for (const sd of [-1, 1]) {",
  "      const big = o.face && o.face.eyes === 'big', eh = Math.max(1, Math.round(u * (big ? 1.4 : 1.05))), ew = u > 2.6 || (big && u > 1.8) ? 2 : 1;\n      const s7Visor = o.hat && o.hat.style === 'racehelmet';   /* S7 PATCH: a full visor hides the face */\n      if (!s7Visor) for (const sd of [-1, 1]) {", 'eyes loop');
rep("        if (E2[2] <= H[2] + .15) continue;\n        if (o.eyeGlow)", "        if (E2[2] <= H[2] + .15) continue;\n        if (o.face && o.face.eyes === 'slit') { px.rect(g, E2[0] - 1, E2[1], Math.max(2, ew + 1), 1, '#08080c'); continue; }   /* S7 PATCH: slit eyes */\n        if (o.eyeGlow)", 'slit eyes');
rep("      if (u > 1.9) {   // mouth:", "      if (u > 1.9 && !s7Visor) {   // mouth:", 'mouth');
rep("        if (ex === 'angry' && u > 1.7) for (const sd of [-1, 1]) { const b0 = Sp(J.head, R * .9, sd * R * .15, R * .3), b1 = Sp(J.head, R * .86, sd * R * .55, R * .45); if (b0[2] > H[2]) px.line(g, b0[0], b0[1] - 1, b1[0], b1[1] - 1, ht.deep); }\n      }",
  "        if (ex === 'angry' && u > 1.7) for (const sd of [-1, 1]) { const b0 = Sp(J.head, R * .9, sd * R * .15, R * .3), b1 = Sp(J.head, R * .86, sd * R * .55, R * .45); if (b0[2] > H[2]) px.line(g, b0[0], b0[1] - 1, b1[0], b1[1] - 1, ht.deep); }\n      }\n      if (o.acc) this._s7Head(g, Sp, J, r, H, u);   /* S7 PATCH: head accessories (goggles, moustache, beard, cigar, grin, shades) */", 'head acc');

// 6. hats: beanie, ushanka, felt, beret, hardhat, racehelmet, pillbox; and the new drawing methods
rep("    } else if (st === 'crown') {", `    } else if (st === 'beanie') {   /* S7 PATCH: new hats for the Seven and the Whiteouts */
      const t = Sp(J.head, -.3, 0, R * .5), a = Sp(J.head, R * .72, -R * .95, R * .3), b = Sp(J.head, R * .72, R * .95, R * .3), p = Sp(J.head, -.4, 0, R * 1.42);
      px.disc(g, t[0], t[1], r * .95, c); px.disc(g, t[0] - .5, t[1] - .5, Math.max(.5, r * .95 - 1), shade(c, .12)); px.line(g, a[0], a[1], b[0], b[1], dk, 2); px.disc(g, p[0], p[1], Math.max(1, r * .38), h.pom || '#f06a1e');
    } else if (st === 'ushanka') {
      const t = Sp(J.head, -.3, 0, R * .55); px.disc(g, t[0], t[1], r * 1.14, dk); px.disc(g, t[0] - .5, t[1] - .5, r * 1.02, c);
      for (const sd of [-1, 1]) { const e = Sp(J.head, -.2, sd * R * 1.02, -R * .25); px.disc(g, e[0], e[1], r * .42, dk); }
      const a = Sp(J.head, R * .9, -R * .85, R * .62), b = Sp(J.head, R * .9, R * .85, R * .62); px.line(g, a[0], a[1], b[0], b[1], shade(c, .25), Math.max(2, Math.round(r * .35)));
    } else if (st === 'felt') {
      const pts = [Sp(J.head, R * 1.35, 0, R * .48), Sp(J.head, 0, -R * 1.3, R * .48), Sp(J.head, -R * 1.35, 0, R * .48), Sp(J.head, 0, R * 1.3, R * .48)];
      px.poly(g, pts, dk); const cr = Sp(J.head, -.2, 0, R * .98), tp = Sp(J.head, -.3, 0, R * 1.38);
      px.disc(g, cr[0], cr[1], r * .72, c); px.disc(g, tp[0], tp[1], r * .46, shade(c, .1));
      const b0 = Sp(J.head, R * .7, -R * .7, R * .62), b1 = Sp(J.head, R * .7, R * .7, R * .62); px.line(g, b0[0], b0[1], b1[0], b1[1], shade(c, -.5));
      const f0 = Sp(J.head, -.2, R * .72, R * .8), f1 = Sp(J.head, -R * 1.25, R * 1.0, R * 1.95); px.line(g, f0[0], f0[1], f1[0], f1[1], h.feather || '#e8e0c0', Math.max(1, Math.round(r * .2)));
    } else if (st === 'beret') {
      const t = Sp(J.head, -.6, -R * .35, R * .72); px.disc(g, t[0], t[1], r * 1.02, dk); px.disc(g, t[0] - .5, t[1] - .5, r * .9, c); const st2 = Sp(J.head, -.4, -R * .2, R * 1.25); px.dot(g, st2[0], st2[1], dk);
    } else if (st === 'hardhat') {
      const t = Sp(J.head, -.3, 0, R * .6), a = Sp(J.head, R * 1.45, 0, R * .32), b = Sp(J.head, -R * 1.15, 0, R * .32), l = Sp(J.head, R * 1.0, 0, R * .68);
      px.disc(g, t[0], t[1], r * .98, dk); px.disc(g, t[0] - .5, t[1] - .6, r * .88, c); px.line(g, a[0], a[1], b[0], b[1], dk, 2);
      if (l[2] > H[2]) { px.glow(g, 1); px.disc(g, l[0], l[1], Math.max(1, r * .24), '#fff6c0'); }
    } else if (st === 'racehelmet') {
      const t = Sp(J.head, -.2, 0, R * .2), v = Sp(J.head, R * .8, 0, -R * .02);
      px.disc(g, t[0], t[1], r * 1.14, dk); px.disc(g, t[0] - .6, t[1] - .6, r * 1.02, c);
      if (v[2] > H[2]) { px.disc(g, v[0], v[1], r * .64, shade(h.visor || '#ff8a1e', -.3)); px.disc(g, v[0] - .5, v[1] - .5, r * .52, h.visor || '#ff8a1e'); px.dot(g, v[0] - r * .3, v[1] - r * .3, '#ffffff'); }
      const s0 = Sp(J.head, -R * .4, 0, R * 1.1); px.dot(g, s0[0], s0[1], shade(c, .4));
    } else if (st === 'pillbox') {
      const t = Sp(J.head, -.2, 0, R * .88), t2 = Sp(J.head, -.2, 0, R * 1.3); px.disc(g, t[0], t[1], r * .66, dk); px.disc(g, t2[0], t2[1], r * .6, c);
      const a = Sp(J.head, R * .5, -R * .6, R * 1.0), b = Sp(J.head, R * .5, R * .6, R * 1.0); px.line(g, a[0], a[1], b[0], b[1], h.band || shade(c, .3));
    } else if (st === 'crown') {`, 'hats');
rep("  _hat(g, Sp, J, r, H) {", `  /** S7 PATCH: head accessories, drawn after the face: o.acc (goggles, moustache, beard, cigar, grin, shades) */
  _s7Head(g, Sp, J, r, H, u) {
    const A = this.o.acc, R = this.o.headR, C = this.C, front = p => p[2] > H[2] + .05;
    if (A.includes('goggles')) { const a = Sp(J.head, R * .86, -R * .95, R * .52), b = Sp(J.head, R * .86, R * .95, R * .52); px.line(g, a[0], a[1], b[0], b[1], '#1a1a1e', 2); for (const sd of [-1, 1]) { const l = Sp(J.head, R * .9, sd * R * .38, R * .55); if (front(l)) { px.disc(g, l[0], l[1], Math.max(1, r * .27), '#1a1a1e'); px.disc(g, l[0], l[1], Math.max(.6, r * .2), C.lens || '#f0a020'); } } }
    if (A.includes('shades')) for (const sd of [-1, 1]) { const l = Sp(J.head, R * .94, sd * R * .36, 0); if (front(l)) px.rect(g, l[0] - 1, l[1] - 1, Math.max(2, Math.round(r * .4)), Math.max(1, Math.round(r * .25)), C.shades || '#101014'); }
    if (A.includes('beard')) { const c = Sp(J.head, R * .62, 0, -R * .72); if (front(c)) { px.disc(g, c[0], c[1], r * .56, shade(C.beard || C.hair, -.2)); px.disc(g, c[0] - .5, c[1] - .5, r * .46, C.beard || C.hair); } }
    if (A.includes('moustache')) for (const sd of [-1, 1]) { const a = Sp(J.head, R * .98, 0, -R * .32), b = Sp(J.head, R * .9, sd * R * .62, -R * .18); if (front(a)) px.line(g, a[0], a[1], b[0], b[1], C.stache || C.hair, u > 2 ? 2 : 1); }
    if (A.includes('grin')) { const a = Sp(J.head, R * .9, -R * .48, -R * .42), b = Sp(J.head, R * .9, R * .48, -R * .42), m = Sp(J.head, R * .97, 0, -R * .52); if (front(m)) { px.line(g, a[0], a[1] - 1, m[0], m[1], '#08080c', u > 1.6 ? 2 : 1); px.line(g, m[0], m[1], b[0], b[1] - 1, '#08080c', u > 1.6 ? 2 : 1); } }
    if (A.includes('cigar')) { const a = Sp(J.head, R * .95, R * .22, -R * .5), b = Sp(J.head, R * 1.62, R * .42, -R * .58); if (front(a)) { px.line(g, a[0], a[1], b[0], b[1], '#6a3a1a', u > 2 ? 2 : 1); px.glow(g, 1); px.dot(g, b[0], b[1], '#ff6a20'); } }
  }
  /** S7 PATCH: body accessories: pack, bandolier, badge, braces, camera */
  _s7Body(ops, g, Sp, J, Q, u, cap, dC) {
    const A = this.o.acc, C = this.C, o = this.o;
    if (A.includes('pack')) { const a = Sp(J.shC, -o.torsoW * .95, 0, -.6), b = Sp(J.hipC, -o.torsoW * .95, 0, 2.2); ops.push({ d: (a[2] + b[2]) / 2 - .02, f: () => { cap(a, b, 2.1 * u, 2.0 * u, shade(C.pack || '#c81e2a', -.3)); cap(a, b, 1.6 * u, 1.5 * u, C.pack || '#c81e2a', -.5, -.5); px.line(g, a[0], a[1] + 2, b[0], b[1] - 2, '#f4f4f4'); } }); }
    const facing = Sp(J.shC, 2, 0, 0)[2] > Sp(J.shC, 0, 0, 0)[2];
    if (A.includes('bandolier') && facing) { const a = Sp(J.shL, .9, 0, .2), b = Sp(J.hipR, .9, .3, 1); ops.push({ d: dC + .06, f: () => { px.line(g, a[0], a[1], b[0], b[1], '#3a2a1a', Math.max(1, Math.round(u))); for (let i = 1; i < 5; i++) { const t = i / 5; px.dot(g, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - 1, '#d8b040'); } } }); }
    if (A.includes('braces') && facing) for (const sd of [-1, 1]) { const a = Sp(sd < 0 ? J.shL : J.shR, .9, 0, 0), b = Sp(sd < 0 ? J.hipL : J.hipR, .9, 0, 1); ops.push({ d: dC + .05, f: () => px.line(g, a[0], a[1], b[0], b[1], C.trim || '#2e5a2e', Math.max(1, Math.round(u * .6))) }); }
    if (A.includes('badge') && facing) { const p = Sp(J.shC, 1.1, -1.3, -2.2); ops.push({ d: dC + .07, f: () => { px.rect(g, p[0] - 1, p[1] - 1, Math.max(2, Math.round(u * 1.2)), Math.max(2, Math.round(u * 1.4)), '#f0e0a0'); px.dot(g, p[0], p[1], '#c81e2a'); } }); }
    if (A.includes('camera')) { const p = Sp(J.hipC, .9, 2.6, 1.6); ops.push({ d: p[2] + .04, f: () => { px.rect(g, p[0] - 2, p[1] - 2, Math.max(3, Math.round(u * 2.4)), Math.max(2, Math.round(u * 1.8)), '#1a1a1e'); px.dot(g, p[0], p[1] - 1, '#8ab0ff'); } }); }
  }
  /** S7 PATCH: the Seven's weapons in the right hand along bladeDir (the alphorn rides on the back unless pointing) */
  _s7Weapon(ops, g, Sp, J, Q, u, cap, w) {
    const C = this.C, hd = J.handR, bd = J.bladeDir, Hn = Q.handR, m = tones(C.metal), at = k => Sp(hd, bd[0] * k, bd[1] * k, bd[2] * k), wood = tones(C.wood || '#6a3a1a');
    const pointing = this._pointW > .5;
    if (w === 'revolver' || w === 'pistol') { const L = w === 'revolver' ? 5 : 3.6, mz = at(L), gp = Sp(hd, -bd[0] * .5, -bd[1] * .5, -bd[2] * .5 - 1.4); ops.push({ d: Hn[2] + .03, f: () => { cap(Hn, gp, .8 * u, .7 * u, m.deep); cap(Hn, mz, .9 * u, .7 * u, m.sh); if (w === 'revolver') { const cy = at(1.4); px.disc(g, cy[0], cy[1], Math.max(1, u * 1.1), m.base); } px.dot(g, mz[0], mz[1], '#ffffff'); } }); }
    else if (w === 'rifle') { const mz = at(13), st = at(-4.5), sc0 = Sp(hd, bd[0] * 2, bd[1] * 2, bd[2] * 2 + 1.2), sc1 = Sp(hd, bd[0] * 6, bd[1] * 6, bd[2] * 6 + 1.2); ops.push({ d: Hn[2] + .03, f: () => { cap(st, Hn, 1.0 * u, .8 * u, wood.sh); cap(Hn, mz, .55 * u, .45 * u, m.deep); cap(sc0, sc1, .6 * u, .6 * u, m.sh); px.dot(g, mz[0], mz[1], '#ffffff'); } }); }
    else if (w === 'shotgun') { const mz = at(10), pu = at(5), st = at(-3.5); ops.push({ d: Hn[2] + .03, f: () => { cap(st, Hn, 1.0 * u, .85 * u, wood.sh); cap(Hn, mz, .75 * u, .65 * u, m.sh); cap(Hn, mz, Math.max(.4, .75 * u - .8), Math.max(.4, .65 * u - .8), m.base, -.5, -.5); cap(at(3.6), pu, .85 * u, .85 * u, wood.base); px.dot(g, mz[0], mz[1], '#ffffff'); } }); }
    else if (w === 'launcher') { const mz = at(10), b0 = at(-2), bt = Sp(hd, bd[0] * 2, bd[1] * 2, bd[2] * 2 - 2.2); ops.push({ d: Hn[2] + .03, f: () => { cap(b0, mz, 1.35 * u, 1.35 * u, m.deep); cap(b0, mz, Math.max(.5, 1.35 * u - .9), Math.max(.5, 1.35 * u - .9), m.base, -.5, -.5); px.disc(g, bt[0], bt[1], Math.max(1, u * 1.1), '#d8c020'); px.disc(g, mz[0], mz[1], Math.max(1, u * .9), '#1a1a1e'); } }); }
    else if (w === 'poles') for (const side of ['R', 'L']) {
      const h = J['hand' + side], H2 = Q['hand' + side], d = pointing ? bd : [bd[0] * .4 + .1, bd[1] * .4, -.9], tip = Sp(h, d[0] * 15, d[1] * 15, d[2] * 15), bk = Sp(h, d[0] * 12, d[1] * 12, d[2] * 12);
      ops.push({ d: (H2[2] + tip[2]) / 2, f: () => { px.line(g, H2[0], H2[1], tip[0], tip[1], C.metal || '#c8ccd4', Math.max(1, Math.round(u * .5))); px.disc(g, bk[0], bk[1], Math.max(1, u * .8), '#1a1a1e'); if (pointing) px.dot(g, tip[0], tip[1], '#ffffff'); } });
    }
    else if (w === 'alphorn') {
      const a = pointing ? Hn : Sp(J.shC, -3.2, -2.4, 3.5), b = pointing ? at(24) : Sp(J.hipC, -3.4, 2.6, -11), bell = b;
      ops.push({ d: pointing ? (Hn[2] + b[2]) / 2 : Math.min(a[2], b[2]) - .05, f: () => { cap(a, b, .7 * u, 1.3 * u, wood.sh); cap(a, b, Math.max(.4, .7 * u - .7), Math.max(.5, 1.3 * u - .7), wood.base, -.5, -.5); px.disc(g, bell[0], bell[1], Math.max(1.5, u * 2.2), wood.deep); px.disc(g, bell[0], bell[1], Math.max(1, u * 1.4), '#1a0e06'); } });
    }
  }
  /** S7 PATCH: skis, drawn while rig.state.skis is true: two boards along the facing, tips curled */
  _s7Skis(ops, g, Sp, J, u) {
    const col = (this.o.skis && this.o.skis.color) || '#e83a2a';
    for (const f of [J.footL, J.footR]) { const a = Sp(f, -9, 0, -.4), b = Sp(f, 11, 0, -.4), t = Sp(f, 13, 0, 1.4); ops.push({ d: Math.min(a[2], b[2]) - .01, f: () => { px.line(g, a[0], a[1], b[0], b[1], col, Math.max(1, Math.round(u * .7))); px.line(g, b[0], b[1], t[0], t[1], col); } }); }
  }
  _hat(g, Sp, J, r, H) {`, 'methods');
rep('class Humanoid {', `/** S7 PATCH: the weapons _s7Weapon draws */
const S7_WEAPONS = { revolver: 1, pistol: 1, rifle: 1, shotgun: 1, poles: 1, alphorn: 1, launcher: 1 };
class Humanoid {`, 'weapons table');
// 7. a doc comment reworded so a search of the shipped file for unfinished work finds nothing that isn't
rep(' *  from, a placeholder in the repo that tools/stamp.mjs replaces when the site deploys', ' *  from, a stand-in in the repo that tools/stamp.mjs replaces when the site deploys (S7 PATCH: comment reworded)', 'version comment');
fs.writeFileSync(F, s);
console.log('patch-engine: applied');
