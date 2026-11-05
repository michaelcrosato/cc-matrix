/* 16-dress: the swimsuits, drawn over the rig. The engine dresses the body in plain outfit colours; this paints each suit's
 * cut (one piece, crop top, tankini, rash guard, halter, sarong, racer) and its pattern (stripes, dots, waves, stars,
 * florals, palms, checks, gradients, zigzags, scales, sevens, gold lame) on the torso and the shorts, and adds the buns of
 * the hair styles the engine lacks. The points are the rig's joints, projected with the view. */
G.CUT = {
  onepiece: { top: 1, bottom: 'brief' }, racer: { top: 1, bottom: 'brief' }, halter: { top: 1, bottom: 'brief', strap: true },
  sport2: { top: .55, bottom: .35 }, tankini: { top: .8, bottom: .3 }, rash: { top: 1, bottom: .45 }, sarong: { top: 1, bottom: .3, wrap: true }
};
/* a point in the rig's frame, as a buffer pixel (the view is orthographic, so a offset projects the same from any spot) */
G.bufPoint = function (r, ox, oy, rig, joint) {
  const d = rig.worldOffset(rig.J[joint] || [0, 0, 0]), a = r.w(0, 0, 0), b = r.w(d[0], d[1], d[2]);
  return [ox + b[0] - a[0], oy + b[1] - a[1]];
};
G.lerpPt = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/* the pattern colour at a pixel, or null for the main colour */
G.patternAt = function (pat, x, y, c) {
  switch (pat) {
    case 'stripes': return y % 3 === 0 ? c[1] : null;
    case 'pin': return x % 4 === 0 ? c[1] : null;
    case 'dots': return (x % 4 === 1 && y % 4 === 1) ? c[1] : null;
    case 'waves': return ((x + (y % 4 < 2 ? 0 : 2)) % 4 === 0) ? c[1] : null;
    case 'stars': return (x % 5 === 2 && y % 5 === 2) ? c[1] : null;
    case 'floral': return ((x + y) % 6 === 0) ? c[2] : ((x % 6 === 3 && y % 6 === 3) ? c[1] : null);
    case 'palms': return ((x - y) % 5 === 0) ? c[1] : null;
    case 'check': return ((x >> 1) + (y >> 1)) % 2 === 0 ? c[1] : null;
    case 'gradient': return null;
    case 'geo': return ((x + y) % 4 < 2) ? c[1] : null;
    case 'scales': return ((x + (y % 4 < 2 ? 0 : 2)) % 4 === 1 && y % 2 === 0) ? c[1] : null;
    case 'sevens': return ((x * 3 + y) % 7 === 0) ? c[2] : null;
    case 'lame': return ((x * 7 + y * 13) % 11 === 0) ? c[2] : null;
    default: return null;
  }
};
/* fill a convex quad with a colour, and its pattern */
G.fillQuad = function (g, q, main, pat, col) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of q) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const inside = (x, y) => {
    let pos = 0, neg = 0;
    for (let i = 0; i < 4; i++) { const a = q[i], b = q[(i + 1) % 4], cr = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]); if (cr > 0) pos++; else if (cr < 0) neg++; }
    return pos === 0 || neg === 0;
  };
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
    if (!inside(x + .5, y + .5)) continue;
    let c = main;
    if (pat === 'gradient') { const u = (y - y0) / Math.max(1, y1 - y0); c = u < .33 ? col[0] : u < .66 ? col[1] : col[2]; }
    else { const p = G.patternAt(pat, x, y, col); if (p) c = p; }
    E.px.rect(g, x, y, 1, 1, c);
  }
};
/* the suit and the hair over a rig: called from inside its draw callback */
G.dress = function (g, r, rig, ox, oy) {
  G.drawAccessories(g, rig, ox, oy);
  const suit = rig.suitId && G.SUITS[rig.suitId];   // (the top and brief are the engine's; the sleeves are drawn here)
  const J = rig.J || {};
  // sleeves of a rash guard: the upper arm from the shoulder to the elbow
  if (suit && suit.cut === 'rash' && J.elbowL && J.elbowR) {
    for (const s of ['L', 'R']) { const sh = G.bufPoint(r, ox, oy, rig, 'sh' + s), el = G.bufPoint(r, ox, oy, rig, 'elbow' + s); G.fillQuad(g, [[sh[0] - 1, sh[1]], [sh[0] + 1, sh[1]], [el[0] + 1, el[1]], [el[0] - 1, el[1]]], suit.colors[0], 'none', suit.colors); }
  }
  // hair the engine has no style for: buns, a puff, braids, a bob and curls, as shapes on the head
  const hx = rig.hairExtra, hc = (rig.o && rig.o.colors && rig.o.colors.hair) || '#2a1810';
  if (hx && J.head) {
    const hp = G.bufPoint(r, ox, oy, rig, 'head'), s = (rig.o && rig.o.size) || 1;
    if (hx === 'twinbuns') { E.px.disc(g, hp[0] - 5 * s, hp[1] - 2 * s, 2.6 * s, hc); E.px.disc(g, hp[0] + 5 * s, hp[1] - 2 * s, 2.6 * s, hc); }
    if (hx === 'puff') E.px.disc(g, hp[0], hp[1] - 1 * s, 4.5 * s, hc);
    if (hx === 'bun') E.px.disc(g, hp[0], hp[1] - 4 * s, 2.6 * s, hc);
    if (hx === 'braid') for (let k = 0; k < 5; k++) E.px.disc(g, hp[0] - 2 * s + (k % 2) * s, hp[1] + (3 + k * 2.2) * s, 1.2 * s, hc);
    if (hx === 'bob') { E.px.disc(g, hp[0], hp[1] - 1 * s, 4.2 * s, hc); E.px.rect(g, hp[0] - 4 * s, hp[1], 8 * s, 3 * s, hc); }
    if (hx === 'curly') for (let k = 0; k < 7; k++) { const an = k / 7 * Math.PI * 2; E.px.disc(g, hp[0] + Math.cos(an) * 4 * s, hp[1] - 1 * s + Math.sin(an) * 3 * s, 1.4 * s, hc); }
  }
  // hats: a sun hat's wide brim with its band, a visor's brim alone
  if (rig.hatExtra && J.head) {
    const hp = G.bufPoint(r, ox, oy, rig, 'head'), s = (rig.o && rig.o.size) || 1;
    if (rig.hatExtra === 'sunhat') { E.px.rect(g, hp[0] - 9 * s, hp[1] - 5 * s, 18 * s, 2 * s, '#e8d49a'); E.px.rect(g, hp[0] - 4 * s, hp[1] - 7 * s, 8 * s, 2 * s, '#e8d49a'); E.px.rect(g, hp[0] - 4 * s, hp[1] - 6 * s, 8 * s, 1 * s, '#e8283a'); }
    if (rig.hatExtra === 'visor') E.px.rect(g, hp[0] - 6 * s, hp[1] - 2 * s, 12 * s, 2 * s, '#ffffff');
  }
};
