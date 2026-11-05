// Applies the BENTOU engine patches to the pristine handoff engine (handoff/my-3d2dge.js) and writes engine/my-3d2dge.js.
// Every patch must match exactly once; the script fails loudly otherwise. engine/PATCHES.md lists them.
import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('..', import.meta.url);
let src = readFileSync(new URL('handoff/my-3d2dge.js', root), 'utf8');
const patches = [];
const P = (n, what, from, to) => patches.push({ n, what, from, to });

// 1. pixel font glyphs for PlayStation face buttons
P(1, 'font glyphs', `"♪": '..##.|..#.#|..#..|..#..|.##..|###..|.#...'`,
  `"♪": '..##.|..#.#|..#..|..#..|.##..|###..|.#...', // BENTOU PATCH 1
  "✕": '.....|#...#|.#.#.|..#..|.#.#.|#...#|.....', "○": '.....|.###.|#...#|#...#|#...#|.###.|.....', "□": '.....|#####|#...#|#...#|#...#|#####|.....', "△": '.....|..#..|..#..|.#.#.|.#.#.|#####|.....'`);

// 2. button symbols: PlayStation by default, or Xbox
P(2, 'glyph setting', `glyphs: { group: 'Controller', label: 'Button symbols', type: 'select', value: 'auto', options: [['auto', 'Auto'], ['xbox', 'Xbox'], ['playstation', 'PlayStation'], ['nintendo', 'Nintendo'], ['generic', 'Positions']]`,
  `glyphs: { group: 'Controller', label: 'Button symbols', type: 'select', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']] /* BENTOU PATCH 2 */`);

// 3. humanoid gear: masks, jingasa / kabuto hats, spear / bow / club, an offhand blade, a sashimono banner
P(3, 'weapons allowed', `if (this.o.weapon && !['sword', 'gun', 'staff'].includes(this.o.weapon))`, `if (this.o.weapon && !['sword', 'gun', 'staff', 'spear', 'bow', 'club'].includes(this.o.weapon)) /* BENTOU PATCH 3 */`);
P(3, 'oni mask face', `      if (o.hat) this._hat(g, Sp, J, r, H);
      // face: eyes`, `      if (o.mask && o.mask.style === 'oni') {   // BENTOU PATCH 3: a red oni face with heavy brows and tusks
        const mt = tones(o.mask.color || '#b0201a'), F = Sp(J.head, R * .35, 0, -R * .05);
        if (F[2] > H[2] - R * .2) { px.disc(g, F[0], F[1], r * .86, mt.sh); px.disc(g, F[0] - .5, F[1] - .5, Math.max(.6, r * .86 - 1), mt.base);
          for (const sd of [-1, 1]) { const hb = Sp(J.head, R * .2, sd * R * .55, R * .75), ht2 = Sp(J.head, -R * .1, sd * R * 1.1, R * 1.7); px.line(g, hb[0], hb[1], ht2[0], ht2[1], '#e8dcc0', Math.max(1, Math.round(u * .6)));
            const tk = Sp(J.head, R * .95, sd * R * .3, -R * .55), tk2 = Sp(J.head, R * 1, sd * R * .35, -R * .2); if (tk[2] > H[2]) px.line(g, tk[0], tk[1], tk2[0], tk2[1], '#f4ecd8');
            const br = Sp(J.head, R * .92, sd * R * .4, R * .32); if (br[2] > H[2]) px.line(g, br[0] - r * .3, br[1] + (sd > 0 ? 0 : 0), br[0] + r * .3, br[1] - 1, mt.deep, Math.max(1, Math.round(u * .5))); } }
      }
      if (o.hat) this._hat(g, Sp, J, r, H);
      // face: eyes`);
P(3, 'no mouth under a mask', `if (u > 1.9) {   // mouth:`, `if (u > 1.9 && !o.mask) {   // BENTOU PATCH 3 (no mouth under a mask) mouth:`);
P(3, 'cloth mask', `    } });
    // ---- arms, hands, shoulder pads ----`, `      if (o.mask && o.mask.style !== 'oni') {   // BENTOU PATCH 3: a cloth mask over nose and mouth, the eyes left clear
        const R = o.headR, r = R * u * .93, mt = tones(o.mask.color || '#232a44'), H = Sp(J.head, R * .1, 0, -R * .05), M = Sp(J.head, R * .62, 0, -R * .5);
        if (M[2] > H[2] - R * .35) { px.disc(g, M[0], M[1], r * .62, mt.sh); px.disc(g, M[0] - .4, M[1] - .4, Math.max(.5, r * .62 - .9), mt.base); const a = Sp(J.head, R * .85, -R * .7, -R * .12), b = Sp(J.head, R * .85, R * .7, -R * .12); px.line(g, a[0], a[1], b[0], b[1], mt.deep); }
      }
    } });
    // ---- arms, hands, shoulder pads ----`);
P(3, 'new weapons', `    if (o.weapon === 'sword') {
      const hd = J.handR, bd = J.bladeDir, Lb = o.bladeLen, Hn = Q.handR, sl`, `    // BENTOU PATCH 3: yari, bow, kanabo, an offhand blade and a sashimono banner
    if (o.weapon === 'spear') {
      const hd = J.handR, bd = J.bladeDir, Hn = Q.handR, tip = Sp(hd, bd[0] * 17, bd[1] * 17, bd[2] * 17), b0 = Sp(hd, bd[0] * 13.5, bd[1] * 13.5, bd[2] * 13.5), bot = Sp(hd, -bd[0] * 8, -bd[1] * 8, -bd[2] * 8), wt = tones(C.staff || '#6a4a2a'), m = tones(C.metal);
      ops.push({ d: (Hn[2] + tip[2]) / 2, f: () => { cap(bot, b0, .5 * u, .5 * u, wt.sh); px.line(g, bot[0] - .4, bot[1] - .4, b0[0] - .4, b0[1] - .4, wt.lt); cap(b0, tip, .75 * u, .2, m.sh); px.line(g, b0[0], b0[1], tip[0], tip[1], m.hi); px.dot(g, b0[0], b0[1], '#8a1c1c'); } });
    } else if (o.weapon === 'bow') {
      const hd = J.handR, Hn = Q.handR, top = Sp(hd, 1.6, 0, 8), mid = Sp(hd, 3.2, 0, 0), bot = Sp(hd, 1.6, 0, -8), wt = tones(C.staff || '#5a3a22'), pull = this._pointW > .3 ? Sp(J.handL, 0, 0, 0) : Sp(hd, .2, 0, 0);
      ops.push({ d: Hn[2] + .02, f: () => { px.line(g, top[0], top[1], pull[0], pull[1], '#e8e0c8'); px.line(g, bot[0], bot[1], pull[0], pull[1], '#e8e0c8'); cap(top, mid, .45 * u, .55 * u, wt.sh); cap(mid, bot, .55 * u, .45 * u, wt.sh); px.line(g, top[0] - .4, top[1] - .4, mid[0] - .4, mid[1] - .4, wt.lt); } });
    } else if (o.weapon === 'club') {
      const hd = J.handR, bd = J.bladeDir, Hn = Q.handR, L = o.bladeLen || 12, tip = Sp(hd, bd[0] * L, bd[1] * L, bd[2] * L), pom = Sp(hd, -bd[0] * 2, -bd[1] * 2, -bd[2] * 2), m = tones(C.metal || '#3a3a40');
      ops.push({ d: (Hn[2] + tip[2]) / 2, f: () => { cap(pom, tip, .6 * u, 1.7 * u, m.deep); cap(pom, tip, Math.max(.4, .6 * u - .8), Math.max(.5, 1.7 * u - .8), m.base, -.5, -.5); for (let k = 2; k <= 5; k++) { const q = lq(pom, tip, k / 6); px.dot(g, q[0] + 1, q[1], m.hi); px.dot(g, q[0] - 1, q[1] + 1, m.hi); } } });
    }
    if (o.offhand) {
      const hd = J.handL, el = J.elbowL, Hn = Q.handL, dx = hd[0] - el[0], dy = hd[1] - el[1], dz = hd[2] - el[2], l = Math.hypot(dx, dy, dz) || 1, Lb = o.offhand.len || 5;
      const bd = [(dx / l + .6) / 1.6, dy / l / 1.6, dz / l / 1.6], tip = Sp(hd, bd[0] * Lb, bd[1] * Lb, bd[2] * Lb), m = tones(o.offhand.color || C.metal);
      ops.push({ d: (Hn[2] + tip[2]) / 2, f: () => { cap(Hn, tip, .6 * u, .3, m.sh); px.line(g, Hn[0], Hn[1], tip[0], tip[1], m.hi); px.dot(g, tip[0], tip[1], '#ffffff'); } });
    }
    if (o.sashimono) {
      const p0 = Sp(J.shC, -2.6, 0, -2), p1 = Sp(J.shC, -2.6, 0, 13), f0 = Sp(J.shC, -2.6, 0, 12.5), f1 = Sp(J.shC, -2.6, 4.5, 12.5), f2 = Sp(J.shC, -2.6, 4.5, 5), f3 = Sp(J.shC, -2.6, 0, 5), ft = tones(o.sashimono);
      ops.push({ d: Q.shC[2] - .4, f: () => { px.line(g, p0[0], p0[1], p1[0], p1[1], '#3a2a1a'); px.poly(g, [f0, f1, f2, f3], ft.base); px.line(g, f0[0], f0[1], f3[0], f3[1], ft.deep); const c = lq(f0, f2, .5); px.disc(g, c[0], c[1], Math.max(.6, u * .9), '#f4ead5'); } });
    }
    if (o.weapon === 'sword') {
      const hd = J.handR, bd = J.bladeDir, Lb = o.bladeLen, Hn = Q.handR, sl`);
P(3, 'new hats', `    } else if (st === 'crown') {`, `    } else if (st === 'jingasa') {   // BENTOU PATCH 3: a wide shallow conical hat
      const pts = []; for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; pts.push(Sp(J.head, Math.cos(a) * R * 1.75 - R * .1, Math.sin(a) * R * 1.75, R * .55)); }
      const tip = Sp(J.head, -R * .1, 0, R * 1.35); px.poly(g, pts, dk); for (let k = 0; k < 10; k++) { const a = pts[k], b = pts[(k + 1) % 10]; px.poly(g, [a, b, tip], k % 2 ? c : shade(c, .12)); } px.dot(g, tip[0], tip[1], shade(c, .4));
    } else if (st === 'kabuto') {   // BENTOU PATCH 3: a helmet with a neck guard and a golden crest
      const t = Sp(J.head, -.6, 0, .7), ng = Sp(J.head, -R * .6, 0, -R * .2), cr = h.crest || '#c8a040';
      px.disc(g, ng[0], ng[1], r * 1.05, dk); px.disc(g, t[0], t[1], r * 1.02, c); px.disc(g, t[0] - 1, t[1] - 1, Math.max(.6, r * .6), shade(c, .2));
      const f = Sp(J.head, R * .78, 0, -.2); px.disc(g, f[0], f[1], r * .52, this.C.skin);
      const b = Sp(J.head, R * .85, 0, R * .75); for (const sd of [-1, 1]) { const q = Sp(J.head, R * 1.1, sd * R * 1.0, R * 1.9); px.line(g, b[0], b[1], q[0], q[1], cr, Math.max(1, Math.round(r * .2))); }
    } else if (st === 'crown') {`);

// 4. Shell: custom screens show settings rows; the Dev group never shows in the player's Settings
P(4, 'shell rows', `    for (const [h, t] of v(s.sections) || []) add(this._el('div', 'esh-k esh-sec', h), this._el('p', 'esh-m', t));`,
  `    for (const [h, t] of v(s.sections) || []) add(this._el('div', 'esh-k esh-sec', h), this._el('p', 'esh-m', t));
    if (s.rows) for (const k of v(s.rows)) add(this._row(k));   // BENTOU PATCH 4`);
P(4, 'no Dev group in settings', `.filter(g => !SHELL_GROUPS.includes(g) && !['Controls', 'Controller', 'Touch'].includes(g))`, `.filter(g => !SHELL_GROUPS.includes(g) && !['Controls', 'Controller', 'Touch', 'Dev'].includes(g)) /* BENTOU PATCH 4 */`);

// 5 + 6. Shell: hover moves the focus; a 10-foot scale by window height
P(5, 'hover focus + ui scale', `    const host = document.body; host.appendChild(r);`, `    const host = document.body; host.appendChild(r);
    // BENTOU PATCH 5: the mouse over a button or slider moves the focus there
    r.addEventListener('pointermove', e => { const t = e.target && e.target.closest ? e.target.closest('button, input') : null; if (t && !t.disabled && t !== document.activeElement && this._els && this._els.scr.contains(t)) t.focus({ preventScroll: true }); });
    // BENTOU PATCH 6: --ui scales the panels with the window's height (a TV at 10 feet), times E.uiScale (the game's setting)
    this.rescale = () => r.style.setProperty('--ui', String(Math.max(1, Math.min(3, (innerHeight / 720) * (E.uiScale || 1)))));
    this.rescale(); addEventListener('resize', this.rescale, { signal });`);
P(6, 'ui scale css', '@keyframes esh-in{from{opacity:0}}`;', '@keyframes esh-in{from{opacity:0}}\n.esh{font-size:16px}.esh-mod,.esh-ttl>div,.esh-toast,.esh-pr,.esh-tut{zoom:var(--ui,1)}.esh-sh button{min-height:52px;font-size:15px}.esh-row{padding:9px 0}.esh-m{font-size:14px}.esh-mod{width:min(560px,100%)}/* BENTOU PATCH 6 */`;');

// 7. music track envelopes: plucked notes ring and decay; attack per track
P(7, 'track envelopes', `this._voice({ wave: t.wave || 'square', freq: f * Math.pow(2, t.octave || 0), dur: n * spb * (t.gate || .9), vol, hold: true, attack: .006, vib: t.vib }, bus, time);`,
  `this._voice({ wave: t.wave || 'square', freq: f * Math.pow(2, t.octave || 0), dur: t.pluck ? Math.max(t.ring || 1.1, n * spb * .5) : n * spb * (t.gate || .9), vol, hold: !t.pluck, attack: t.attack || .006, release: t.release, vib: t.vib }, bus, time);   // BENTOU PATCH 7`);
P(7, 'release', `if (p.hold) { g.gain.setValueAtTime(vol, Math.max(t + att, end - .03)); g.gain.linearRampToValueAtTime(0, end); }`,
  `if (p.hold) { g.gain.setValueAtTime(vol, Math.max(t + att, end - (p.release || .03))); g.gain.linearRampToValueAtTime(0, end); }   // BENTOU PATCH 7 (release)`);

// 8. a voice bus for the gibberish voices
P(8, 'voice bus', `      this._musBus = c.createGain(); this._musBus.connect(this._master);`, `      this._musBus = c.createGain(); this._musBus.connect(this._master);
      this.voiceBus = c.createGain(); this.voiceBus.connect(this._master);   // BENTOU PATCH 8`);

// 9. the hub owns Create + Options: E.pauseGuard(game) can veto the pause press
P(9, 'pause guard', `    if (s && s.pausable && this.input.pressed('pause')) { this.paused = !this.paused;`, `    if (s && s.pausable && this.input.pressed('pause') && !(E.pauseGuard && E.pauseGuard(this))) { /* BENTOU PATCH 9 */ this.paused = !this.paused;`);

for (const p of patches) {
  const n = src.split(p.from).length - 1;
  if (n !== 1) { console.error(`patch ${p.n} (${p.what}): ${n} matches`); process.exit(1); }
  src = src.replace(p.from, () => p.to);
}
writeFileSync(new URL('engine/my-3d2dge.js', root), src);
console.log(`engine patched: ${patches.length} edits`);
