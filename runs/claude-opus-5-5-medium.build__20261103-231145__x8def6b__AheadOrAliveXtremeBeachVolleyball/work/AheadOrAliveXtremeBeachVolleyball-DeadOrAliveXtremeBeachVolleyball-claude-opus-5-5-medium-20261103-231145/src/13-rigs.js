/* 13-rigs: the rig factory. Every fighter is an HD Humanoid on the athletic build in a swimsuit: the engine draws the body
 * (patch 5 gives bare legs, shorts and a swimDraw hook in the torso); this file draws each cut and pattern, the hair
 * styles the engine lacks (twin buns, bun, puff, bob, curls, braid ties) and the accessories, depth-sorted around the
 * head. Portraits go through the same draw, so they wear everything too. */
G.ATHLETIC = { legUpper: 7.1, legLower: 7.2, hipZ: 13.9, torso: 8.9, shoulderHalf: 2.95, headR: 3.0, neck: 1.4, armUpper: 5.1, armLower: 4.9, hipHalf: 2.05, limbW: 1.75, torsoW: 2.7, stride: 7.4, speedRef: 80 };
const HAIR_BASE = { twinbuns: 'short', bun: 'short', puff: 'short', bob: 'short', curly: 'short', braid: 'ponytail' };
const tonesOf = c => E.tones(c);
/** a rig for a cast member wearing a suit and accessories */
G.makeRig = (id, o = {}) => {
  const c = G.CAST[id] || G.CAST.rin, size = (o.size || c.size || 1.25) * (o.scale || 1);
  const hairStyle = c.hair.style, base = HAIR_BASE[hairStyle] || hairStyle;
  const opts = Object.assign({}, c.build ? {} : G.ATHLETIC, {
    size, build: c.build || undefined, weapon: null, outfit: c.robe ? 'robe' : 'shirt', hair: base, sleeves: 'none',
    face: { eyes: 'big', bangs: c.bangs === undefined ? .5 : c.bangs },
    colors: { skin: c.skin, hair: c.hair.color, eye: '#1a1320', iris: c.eye, cloth: '#ffffff', pants: c.skin, boot: c.skin, belt: c.skin }
  });
  if (c.shoulder) opts.shoulderHalf = G.ATHLETIC.shoulderHalf + c.shoulder;
  const rig = new E.Humanoid(opts);
  rig.castId = id; rig.extraHair = hairStyle;
  if (c.robe) { rig.C.cloth = c.robe; rig.C.pants = c.skin; rig.C.boot = '#e8c8a0'; rig.C.belt = shade(c.robe, -.2); rig.o.sleeves = 'none'; }
  else if (c.shirt && !o.suit) { Object.assign(rig.C, c.shirt); rig.C.boot = '#8a5a3a'; rig.C.belt = c.shirt.trim; rig.o.sleeves = 'short'; if (id === 'sonny') rig.o.swim = { cut: 'shirt', pattern: 'palms', colors: [c.shirt.cloth, '#ffd36a', '#ff8a5a'] }; }
  rig.baseHat = c.hat || null;
  G.dress(rig, o.suit !== undefined ? o.suit : (c.shirt || c.robe ? null : c.suit), o.acc !== undefined ? o.acc : (c.acc || []));
  const drawBase = rig.draw;
  rig.draw = function (g, ox, oy, view) { G.drawExtras(this, g, ox, oy, view, -1); drawBase.call(this, g, ox, oy, view); G.drawExtras(this, g, ox, oy, view, 1); };
  return rig;
};
const shade = (c, k) => E.shade(c, k);
/** put a suit (an id, or null for the cast member's clothes) and accessories on a rig */
G.dress = (rig, suitId, accs) => {
  const c = G.CAST[rig.castId], s = suitId && G.ITEMS[suitId];
  if (s) {
    const [m, a, t] = s.colors;
    rig.C.cloth = m; rig.C.trim = t; rig.C.belt = s.cut === 'rash' ? a : m; rig.C.swimB = a; rig.C.pants = c.skin; rig.C.boot = c.skin;
    rig.o.sleeves = s.cut === 'rash' ? (s.sleeves || 'short') : 'none';
    rig.o.swim = { cut: s.cut, pattern: s.pattern, colors: s.colors, shorts: s.cut === 'rash' ? .45 : s.cut === 'sarong' ? .55 : s.shorts || 0 };
    rig.suit = s.id;
  } else if (rig.castId === 'sonny' || rig.castId === 'pepper' || G.CAST[rig.castId].staff) { rig.suit = null; }
  rig.acc = (accs || []).slice();
  const band = rig.acc.includes('sweatband') ? { style: 'band', color: '#ff6a5a' } : c.band ? { style: 'band', color: c.band } : null;
  rig.o.hat = band;
  rig.swimDraw = G.swimDraw;
  return rig;
};
/* ---- swimsuit cuts and patterns, drawn inside the torso plate the engine just filled with the main colour ---- */
G.swimDraw = function (g, P) {
  const sw = this.o.swim, [m, a, t] = sw.colors, C = this.C, st = tonesOf(C.skin), mt = tonesOf(m), at = tonesOf(a), tt = tonesOf(t);
  const { shL, shR, hL, hR, lq, facingCam } = P;
  const B = (u, v) => { const top = lq(shL, shR, u), bot = lq(hL, hR, u); return lq(top, bot, v); };
  const quad = (u0, v0, u1, v1, col) => px.poly(g, [B(u0, v0), B(u1, v0), B(u1, v1), B(u0, v1)], col);
  const H = Math.abs(lq(hL, hR, .5)[1] - lq(shL, shR, .5)[1]), Wd = Math.abs(shR[0] - shL[0]) + 2;
  const cut = sw.cut;
  // pattern region (v from, v to), skipping bare skin
  let skin = null;
  if (cut === 'sport2') skin = [.55, .86]; else if (cut === 'tankini') skin = [.8, .9];
  const inSkin = v => skin && v > skin[0] && v < skin[1];
  const vTop = cut === 'rash' || cut === 'shirt' ? 0 : .12;
  // pattern
  const pat = sw.pattern, rows = Math.max(3, Math.round(H / 2)), cols = Math.max(2, Math.round(Wd / 2.2)), T = this.t || 0;
  const dot = (u, v, col) => { if (inSkin(v)) return; const q = B(u, v); px.dot(g, q[0], q[1], col); };
  if (pat === 'gradient') { quad(0, .45, 1, .75, mt.sh); quad(0, .65, 1, 1, at.base); }
  else if (pat === 'stripes') for (let k = 1; k < rows; k += 2) { const v = vTop + (1 - vTop) * k / rows; if (!inSkin(v)) { const q0 = B(0, v), q1 = B(1, v); px.line(g, q0[0], q0[1], q1[0], q1[1], at.base); } }
  else if (pat === 'pin') for (let k = 1; k < cols; k++) { const u = k / cols, q0 = B(u, vTop), q1 = B(u, skin ? skin[0] : 1); px.line(g, q0[0], q0[1], q1[0], q1[1], at.base); if (skin) { const r0 = B(u, skin[1]), r1 = B(u, 1); px.line(g, r0[0], r0[1], r1[0], r1[1], at.base); } }
  else if (pat === 'dots' || pat === 'check' || pat === 'stars' || pat === 'floral' || pat === 'sevens' || pat === 'lame' || pat === 'scales' || pat === 'waves' || pat === 'geo' || pat === 'palms')
    for (let j = 0; j < rows; j++) for (let k = 0; k < cols; k++) {
      const u = (k + .5 + (j % 2) * .5) / (cols + .5), v = vTop + (1 - vTop) * (j + .5) / rows; if (inSkin(v)) continue;
      const q = B(u, v), x = Math.round(q[0]), y = Math.round(q[1]);
      if (pat === 'dots') { if ((j + k) % 2 === 0) px.dot(g, x, y, at.hi); }
      else if (pat === 'check') { if ((j + k) % 2 === 0) px.rect(g, x, y, 1, 1, at.base); else px.dot(g, x, y, mt.lt); }
      else if (pat === 'stars') { if ((j * 3 + k) % 3 === 0) { px.dot(g, x, y, at.hi); px.dot(g, x - 1, y, at.base); px.dot(g, x + 1, y, at.base); } }
      else if (pat === 'floral') { if ((j + k * 2) % 3 === 0) { px.dot(g, x, y, tt.base); px.dot(g, x - 1, y, at.base); px.dot(g, x + 1, y, at.base); px.dot(g, x, y - 1, at.base); } }
      else if (pat === 'sevens') { if ((j + k) % 2 === 0) { px.dot(g, x, y, at.hi); px.dot(g, x + 1, y, at.hi); px.dot(g, x + 1, y + 1, at.base); } }
      else if (pat === 'lame') { if (((j * 7 + k * 3 + Math.floor(T * 6)) % 5) === 0) px.dot(g, x, y, '#ffffff'); else if ((j + k) % 2) px.dot(g, x, y, at.base); }
      else if (pat === 'scales') { if (j % 2 === 0) { px.dot(g, x, y, at.base); px.dot(g, x + 1, y + 1, at.sh); } }
      else if (pat === 'waves') { if (j % 2 === 0) { px.dot(g, x, y, at.base); px.dot(g, x + 1, y - 1, at.base); } }
      else if (pat === 'geo') { if (j % 2 === 0) { px.dot(g, x, y + ((k % 2) ? 1 : 0), at.base); px.dot(g, x + 1, y + ((k % 2) ? 0 : 1), tt.base); } }
      else if (pat === 'palms') { if ((j + k) % 3 === 0) { px.dot(g, x, y, at.base); px.dot(g, x + 1, y + 1, at.sh); px.dot(g, x - 1, y + 1, at.sh); } }
    }
  // cut: bare skin where the suit leaves it, straps and panels
  if (skin) { quad(0, skin[0], 1, skin[1], st.base); const q0 = B(0, skin[1]), q1 = B(1, skin[1]); px.line(g, q0[0], q0[1], q1[0], q1[1], at.base); }
  if (cut !== 'rash' && cut !== 'shirt') {
    // shoulders bare, with straps (halter: up to the neck)
    px.poly(g, [shL, B(.32, 0), B(.08, .14)], st.base); px.poly(g, [shR, B(.68, 0), B(.92, .14)], st.base);
    if (cut === 'halter') { const n = B(.5, -.05), l = B(.3, .12), r = B(.7, .12); px.line(g, l[0], l[1], n[0], n[1], tt.base); px.line(g, r[0], r[1], n[0], n[1], tt.base); }
    else { const l0 = B(.3, 0), l1 = B(.3, .14), r0 = B(.7, 0), r1 = B(.7, .14); px.line(g, l0[0], l0[1], l1[0], l1[1], tt.base); px.line(g, r0[0], r0[1], r1[0], r1[1], tt.base); }
    if (facingCam) px.poly(g, [B(.36, 0), B(.64, 0), B(.5, cut === 'sport2' ? .16 : .24)], st.base);   // neckline
    if (cut === 'racer') { quad(0, .2, .14, .95, at.base); quad(.86, .2, 1, .95, at.base); }
    // the bottom's waistband
    const w0 = B(0, .92), w1 = B(1, .92); px.line(g, w0[0], w0[1], w1[0], w1[1], cut === 'tankini' || cut === 'sport2' ? tt.base : mt.sh);
  } else if (cut === 'rash') { const z0 = B(.5, 0), z1 = B(.5, .95); px.line(g, z0[0], z0[1], z1[0], z1[1], tt.base); const c0 = B(.25, .02), c1 = B(.75, .02); px.line(g, c0[0], c0[1], c1[0], c1[1], tt.base); }
  else if (cut === 'shirt') { const c0 = B(.3, 0), c1 = B(.5, .25), c2 = B(.7, 0); px.line(g, c0[0], c0[1], c1[0], c1[1], tt.base); px.line(g, c1[0], c1[1], c2[0], c2[1], tt.base); }
};
/* ---- hair the engine lacks and accessories: each a point on the head (or a hand) in the rig's own frame, drawn behind
 * or in front of the body by its depth ---- */
G.drawExtras = (rig, g, ox, oy, view, side) => {
  const R = rig.o.headR, J = rig.J; if (!J || !J.head) return;
  const o0 = view.p(0, 0, 0);
  const P = (f, r, z, at = J.head) => { const w = rig._w([at[0] + f, at[1] + r, at[2] + z]); const q = view.p(w[0], w[1], w[2]); return [ox + q[0] - o0[0], oy + q[1] - o0[1], view.depth(w[0], w[1], w[2])]; };
  const H = P(0, 0, 0), u = view.scale * rig.o.size, rr = R * u * .93, hc = tonesOf(rig.C.hair), c = G.CAST[rig.castId];
  const want = (q) => side < 0 ? q[2] < H[2] : q[2] >= H[2];
  const ball = (q, rad, t) => { if (!want(q)) return; px.disc(g, q[0], q[1], rad, t.sh); px.disc(g, q[0] - .5, q[1] - .5, Math.max(.5, rad - .9), t.base); if (rad > 2) px.dot(g, q[0] - rad * .4, q[1] - rad * .4, t.hi); };
  const hs = rig.extraHair;
  if (hs === 'twinbuns') for (const s of [-1, 1]) { const q = P(-R * .15, s * R * .78, R * .8); ball(q, rr * .55, hc); if (rig.acc.includes('ribbon') && want(q)) { const b = P(-R * .15, s * R * .55, R * .45); px.rect(g, b[0] - 1, b[1] - 1, 3, 2, c.ribbon || rig.C.swimB || '#ff6aa8'); } }
  else if (hs === 'bun') ball(P(-R * .75, 0, R * .55), rr * .5, hc);
  else if (hs === 'puff') { const q = P(-R * .55, 0, R * .85); ball(q, rr * 1.05, hc); if (want(q)) { const b0 = P(R * .1, -R * .8, R * .55), b1 = P(R * .1, R * .8, R * .55); px.line(g, b0[0], b0[1], b1[0], b1[1], c.cuffs || '#ffd36a'); } }
  else if (hs === 'bob') for (const s of [-1, 1]) ball(P(-R * .1, s * R * .82, -R * .3), rr * .5, hc);
  else if (hs === 'curly') for (const [f, r, z] of [[-.7, -.6, .3], [-.7, .6, .3], [-.9, 0, .1], [-.3, -.85, -.2], [-.3, .85, -.2], [-.5, 0, .8]]) ball(P(f * R, r * R, z * R), rr * .42, hc);
  else if (hs === 'braid') ball(P(-R * 1.05, 0, -R * .15), rr * .3, tonesOf(c.ribbon || '#3a5ab0'));
  for (const id of rig.acc || []) {
    if (id === 'ribbon' && hs !== 'twinbuns') { const q = P(-R * .55, R * .55, R * .75); if (want(q)) { px.rect(g, q[0] - 2, q[1] - 1, 2, 2, c.ribbon || '#d8303a'); px.rect(g, q[0] + 1, q[1] - 1, 2, 2, c.ribbon || '#d8303a'); px.dot(g, q[0], q[1], '#ffffff'); } }
    else if (id === 'hibiscus') { const q = P(0, R * .95, R * .3); if (want(q)) { px.disc(g, q[0], q[1], Math.max(1.5, rr * .32), '#e8283a'); px.dot(g, q[0], q[1], '#ffd36a'); } }
    else if (id === 'shellnecklace') for (let k = -2; k <= 2; k++) { const q = P(R * .55, k * R * .28, -R * 1.25 - Math.abs(k) * -.15); if (want(q)) px.dot(g, q[0], q[1], '#ffffff'); }
    else if (id === 'wristbands') for (const hd of [J.handL, J.handR]) { const q = P(0, 0, .6, hd); if (want(q)) px.rect(g, q[0] - 1, q[1] - 1, 2, 2, '#ff5a5a'); }
    else if (id === 'visor' && side > 0) { const b0 = P(R * .9, -R * .7, R * .45), b1 = P(R * 1.6, 0, R * .3), b2 = P(R * .9, R * .7, R * .45); px.poly(g, [b0, b1, b2], '#f4f4f0'); px.line(g, b0[0], b0[1], b2[0], b2[1], '#2a7ad8'); const k0 = P(-R * .5, -R * .9, R * .5), k1 = P(-R * .5, R * .9, R * .5); px.line(g, k0[0], k0[1], b0[0], b0[1], '#f4f4f0'); px.line(g, k1[0], k1[1], b2[0], b2[1], '#f4f4f0'); }
    else if (id === 'sunhat' && side > 0) { const q = P(0, 0, R * .55), rx = rr * 2.1, ry = Math.max(1.5, rr * .7 * Math.abs(view.dz || .5)); px.ell(g, q[0], q[1], rx, ry, '#c8a050'); px.ell(g, q[0], q[1] - .5, rx - 1, Math.max(1, ry - 1), '#e8c880'); const cr = P(-R * .1, 0, R * 1.05); px.disc(g, cr[0], cr[1], rr * .75, '#d8b870'); px.rect(g, cr[0] - rr * .75, cr[1] + rr * .3, rr * 1.5, 1, '#e8283a'); }
  }
  // eyewear on the face, only while it faces the camera
  const shades = (rig.acc || []).find(a => G.ITEMS[a] && G.ITEMS[a].shades), glasses = c.glasses;
  if ((shades || glasses) && side > 0) {
    const fwd = P(R * .95, 0, 0); if (fwd[2] > H[2]) {
      const col = shades === 'heartshades' ? '#ff5fa2' : shades === 'aviators' ? '#c89020' : shades ? '#20262e' : null, lens = shades === 'aviators' ? '#3a2a10' : col;
      for (const s of [-1, 1]) { const q = P(R * .92, s * R * .36, 0); if (q[2] <= H[2]) continue; if (col) { px.rect(g, q[0] - 1, q[1] - 1, 3, 2, lens); px.dot(g, q[0] - 1, q[1] - 1, shades === 'aviators' ? '#ffd36a' : '#8a9ab0'); } else { px.dot(g, q[0] - 1, q[1] - 1, '#c8a060'); px.dot(g, q[0] + 1, q[1] - 1, '#c8a060'); } }
      const a0 = P(R * .92, -R * .36, 0), a1 = P(R * .92, R * .36, 0); px.line(g, a0[0], a0[1] - 1, a1[0], a1[1] - 1, col || '#c8a060');
    }
  }
};
/** the rigs every scene shares, by cast id (dressed as the vacation says, or in their signature suits) */
G.rigs = {};
G.rigFor = (id, suit, acc) => {
  const key = id; let rig = G.rigs[key];
  if (!rig) rig = G.rigs[key] = G.makeRig(id);
  if (suit !== undefined && (rig.suit !== suit || JSON.stringify(rig.acc) !== JSON.stringify(acc || rig.acc))) G.dress(rig, suit, acc || rig.acc);
  return rig;
};
/** what someone wears now: the vacation's wardrobe, or the signature suit */
G.wearOf = id => {
  const S = G.state, c = G.CAST[id];
  if (S && S.me === id) return S.wearing;
  if (S && S.npcWear && S.npcWear[id]) return S.npcWear[id];
  return { suit: c.suit, acc: c.acc || [] };
};
G.portrait = (g, id, x, y, size = 32, o = {}) => {
  const w = G.wearOf(id), rig = G.rigFor(id, G.CAST[id].shirt || G.CAST[id].robe ? undefined : w.suit, w.acc);
  if (!rig.J || !rig.J.head) rig.update(0, { x: 0, y: 0, z: 0, facing: 0 });
  rig.drawPortrait(g, x, y, size, Object.assign({ zoom: size / 13, turn: .5, bg: o.bg || '#12475a', border: o.border || '#f6d38a' }, o));
};
