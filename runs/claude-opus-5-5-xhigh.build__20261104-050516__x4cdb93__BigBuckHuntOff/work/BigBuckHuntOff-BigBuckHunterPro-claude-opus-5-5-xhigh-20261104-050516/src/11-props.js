// 11-props: the props as data: their impostor painters (pixel art at any scale, lit from the upper left with E.tones),
// their size, what blocks a shot (a trunk, a stone, a log; leaves, grass and corn only hide), and the shadow they cast.
const TT = c => E.tones(c);
const occTrunk = (rM, hM) => p => [{ k: 'cyl', x: p.x, y: p.y, z0: p.z, z1: p.z + hM * M * p.scale, r: rM * M * p.scale }];
const occBall = (rM, zM) => p => [{ k: 'sph', x: p.x, y: p.y, z: p.z + zM * M * p.scale, r: rM * M * p.scale }];
const occBox = (hx, hy, hz) => p => [{ k: 'box', x: p.x, y: p.y, z0: p.z, z1: p.z + hz * M * p.scale, hx: hx * M * p.scale, hy: hy * M * p.scale, a: p.facing }];

/** a broadleaf tree: a tapered trunk, branches, a crown of lit leaf clumps (o: h, crown [rx, ry] m, trunk r m, colours) */
function broadleaf(o) {
  return (g, k, v, f, ox, oy) => {
    const R = E.rng(v * 977 + (o.seed || 1)), u = M * k, h = o.h * (.85 + R() * .3), pal = o.pal[v % o.pal.length], bark = TT(o.bark || '#5a4434');
    const crx = o.crown[0] * (.85 + R() * .3) * u, cry = o.crown[1] * (.85 + R() * .25) * u, ccy = oy - (h - o.crown[1] * .55) * u, tw = Math.max(1, o.trunk * 2 * u);
    const lean = (R() - .5) * .12 * h * u;
    if (h * u < 7) { px.line(g, ox, oy, ox + lean, ccy, bark.sh, 1); px.ell(g, ox + lean, ccy, Math.max(1, crx), Math.max(1, cry), TT(pal[0]).sh); px.ell(g, ox + lean - crx * .25, ccy - cry * .25, Math.max(.6, crx * .6), Math.max(.6, cry * .55), TT(pal[0]).base); return; }
    // trunk and branches
    const top = [ox + lean, ccy + cry * .2];
    px.poly(g, [[ox - tw * .7, oy], [ox + tw * .7, oy], [top[0] + tw * .3, top[1]], [top[0] - tw * .3, top[1]]], bark.sh);
    if (tw > 1.5) px.poly(g, [[ox - tw * .55, oy], [ox, oy], [top[0], top[1]], [top[0] - tw * .25, top[1]]], o.birch ? TT(o.bark).lt : bark.base);
    if (o.birch && tw > 1.5) for (let i = 0; i < 8; i++) { const yy = oy - (i + .5) / 8 * (oy - top[1]), xx = lerp(ox, top[0], (oy - yy) / (oy - top[1])); px.rect(g, xx - tw * .4 + R() * tw * .4, yy, Math.max(1, tw * .4), 1, '#2a2420'); }
    if (tw > 2) px.rect(g, ox - tw * .9, oy - 1, tw * 1.8, 1, bark.deep);
    const nb = Math.round(3 + R() * 3);
    for (let i = 0; i < nb; i++) { const t = .35 + R() * .5, bx = lerp(ox, top[0], t), by = lerp(oy, top[1], t) - cry * .3, ex = bx + (R() < .5 ? -1 : 1) * crx * (.4 + R() * .5), ey = by - cry * (.2 + R() * .6); px.line(g, bx, by, ex, ey, bark.sh, Math.max(1, Math.round(tw * .35))); }
    // the crown: clumps in an ellipsoid, drawn dark, base, lit, then specks
    const fine = 1 + Math.min(2.2, u * .9), n = clamp(Math.round((o.clumps || 26) * fine), 8, 110), cl = [];
    for (let i = 0; i < n; i++) { const a = R() * TAU, rr = Math.sqrt(R()), cx = ox + lean + Math.cos(a) * rr * crx * .86, cy = ccy + Math.sin(a) * rr * cry * .8, s = (o.clump || 1.3) * u * (.65 + R() * .6) / Math.sqrt(fine); cl.push([cx, cy, s, R()]); }
    cl.sort((a, b) => a[1] - b[1]);
    const C = pal.map(TT);
    for (const [cx, cy, s, r] of cl) px.disc(g, cx + s * .15, cy + s * .2, s, C[0].deep);
    for (const [cx, cy, s, r] of cl) px.disc(g, cx, cy, s * .92, (cy > ccy + cry * .25 ? C[0].deep : (r < .5 ? C[0] : C[Math.min(C.length - 1, 1)]).sh));
    for (const [cx, cy, s, r] of cl) { const c = C[Math.floor(r * C.length)]; px.disc(g, cx - s * .18, cy - s * .2, s * .68, c.base); }
    for (const [cx, cy, s, r] of cl) if (cy < ccy + cry * .2 && (cx < ox + crx * .3)) { const c = C[Math.floor(r * C.length)]; px.disc(g, cx - s * .35, cy - s * .4, Math.max(.5, s * .34), c.lt); }
    if (u > .9) for (let i = 0; i < n * (u > 2 ? 6 : 2); i++) { const a = R() * TAU, rr = Math.sqrt(R()) * .92, x = ox + lean + Math.cos(a) * rr * crx, y = ccy + Math.sin(a) * rr * cry, q = R(); px.dot(g, x, y, q < .35 ? C[0].hi : q < .7 ? C[C.length - 1].lt : C[0].sh); if (u > 2.2 && q > .8) px.dot(g, x + 1, y + 1, C[0].deep); }
    if (o.holes && u > .6) for (let i = 0; i < 3; i++) { const a = R() * TAU; g.clearRect(Math.round(ox + Math.cos(a) * crx * .5), Math.round(ccy + Math.sin(a) * cry * .4), Math.max(1, Math.round(u * .5)), Math.max(1, Math.round(u * .4))); }
  };
}
/** a conifer: tiers of drooping boughs, narrowing to the top (snow on them when o.snow) */
function conifer(o) {
  return (g, k, v, f, ox, oy) => {
    const R = E.rng(v * 613 + (o.seed || 3)), u = M * k, h = o.h * (.85 + R() * .35), w = o.w * (.85 + R() * .3) * u, C = TT(o.pal[v % o.pal.length]), bark = TT(o.bark || '#3e2e24');
    const H = h * u, base = oy - o.skirt * h * u;
    if (H < 7) { px.poly(g, [[ox, oy - H], [ox + Math.max(1, w * .6), oy - H * .1], [ox - Math.max(1, w * .6), oy - H * .1]], C.sh); return; }
    px.rect(g, ox - Math.max(1, u * .2), base - u * .5, Math.max(1, u * .4), oy - base + u * .5, bark.sh);
    const tiers = clamp(Math.round(o.tiers || 7), 3, 12);
    for (let i = 0; i < tiers; i++) {
      const t0 = i / tiers, t1 = (i + 1.25) / tiers, y0 = base - t0 * (base - (oy - H)), y1 = base - Math.min(1, t1) * (base - (oy - H)), hw = w * (1 - t0) * (o.sparse ? .8 : 1) * (.9 + R() * .2);
      const sag = (y0 - y1) * .25, jag = [];
      jag.push([ox, y1]);
      const steps = Math.max(2, Math.round(hw / Math.max(1.5, u * .6)));
      for (let s = 0; s <= steps; s++) { const tx = s / steps; jag.push([ox + hw * tx, y1 + (y0 - y1) * (.25 + tx * .75) + (s % 2 ? sag * .4 : 0)]); }
      for (let s = steps; s >= 0; s--) { const tx = s / steps; jag.push([ox - hw * tx, y1 + (y0 - y1) * (.25 + tx * .75) + (s % 2 ? sag * .4 : 0)]); }
      px.poly(g, jag, C.sh);
      if (hw > 2) px.poly(g, jag.map(p => [p[0] - (p[0] < ox ? 0 : (p[0] - ox) * .55), p[1] - .6]), o.sparse ? C.sh : C.base);
      if (hw > 3) px.line(g, ox - hw * .9, y0 - .5, ox - hw * .2, y1 + (y0 - y1) * .5, C.lt);
      if (o.snow && hw > 1.5) { px.line(g, ox - hw * .85, y0 - 1, ox + hw * .3, y0 - (y0 - y1) * .5, '#f2f6fa', Math.max(1, Math.round(u * .25))); if (hw > 4) px.line(g, ox - hw * .5, y1 + (y0 - y1) * .55, ox, y1 + (y0 - y1) * .3, '#dfe8f0'); }
      if (o.sparse && hw > 2.5) for (let s = 0; s < 4; s++) px.dot(g, ox + (R() - .5) * hw * 1.4, lerp(y1, y0, R()), C.lt);
    }
    if (u > 1 && !o.sparse) for (let i = 0; i < 10; i++) px.dot(g, ox - w * .4 + R() * w * .3, oy - H * (.2 + R() * .7), C.hi);
  };
}
function snag(o) {   // a charred dead tree: a broken trunk, a few bare limbs
  return (g, k, v, f, ox, oy) => {
    const R = E.rng(v * 31 + 7), u = M * k, h = o.h * (.6 + R() * .6), tw = Math.max(1, .32 * u), C = TT(o.c || '#2a2422'), top = [ox + (R() - .5) * u * 1.2, oy - h * u];
    px.poly(g, [[ox - tw, oy], [ox + tw, oy], [top[0] + tw * .3, top[1]], [top[0] - tw * .4, top[1] + u * .5]], C.sh);
    if (tw > 1.4) px.line(g, ox - tw * .5, oy, top[0] - tw * .3, top[1] + u, C.lt);
    for (let i = 0; i < 4; i++) { const t = .4 + R() * .5, bx = lerp(ox, top[0], t), by = lerp(oy, top[1], t), s = R() < .5 ? -1 : 1; px.line(g, bx, by, bx + s * (1 + R() * 2) * u, by - (1 + R() * 2) * u, C.sh, Math.max(1, Math.round(tw * .4))); }
    if (o.snow) px.line(g, top[0] - tw, top[1] + 1, top[0] + tw, top[1] + 1, '#eef2f6');
  };
}
function clumpPaint(o) {   // a bush or a tuft: low clumps (leaves) or blades (grass, reeds)
  return (g, k, v, f, ox, oy) => {
    const R = E.rng(v * 211 + (o.seed || 5)), u = M * k, C = o.pal.map(TT);
    if (o.blades) {
      const n = clamp(Math.round(o.blades * Math.min(1, u * .5 + .3)), 3, 40), w = o.w * u, h = o.h * u;
      for (let i = 0; i < n; i++) { const x = ox + (R() - .5) * w * 2, hh = h * (.5 + R() * .6), lean = (R() - .5) * hh * .5, c = C[Math.floor(R() * C.length)]; px.line(g, x, oy, x + lean, oy - hh, R() < .4 ? c.sh : c.base, Math.max(1, Math.round(u * (o.thick || .06)))); if (o.heads && u > .5 && R() < .3) px.line(g, x + lean, oy - hh, x + lean * 1.15, oy - hh - u * .22, TT(o.heads).base, Math.max(1, Math.round(u * .08))); }
      return;
    }
    const n = clamp(Math.round(o.clumps || 9), 4, 24), rx = o.w * u, ry = o.h * u * .5;
    const cl = []; for (let i = 0; i < n; i++) { const a = R() * TAU, rr = Math.sqrt(R()); cl.push([ox + Math.cos(a) * rr * rx * .8, oy - ry - Math.sin(a) * rr * ry * .8 * (Math.sin(a) < 0 ? .5 : 1), (o.clump || .6) * u * (.7 + R() * .6), R()]); }
    cl.sort((a, b) => a[1] - b[1]);
    for (const [x, y, s] of cl) px.disc(g, x + s * .2, Math.min(oy - s * .3, y + s * .2), s, C[0].deep);
    for (const [x, y, s, r] of cl) px.disc(g, x, Math.min(oy - s * .3, y), s * .9, C[Math.floor(r * C.length)].sh);
    for (const [x, y, s, r] of cl) px.disc(g, x - s * .2, Math.min(oy - s * .5, y - s * .2), s * .6, C[Math.floor(r * C.length)].base);
    if (u > .8) for (const [x, y, s, r] of cl) if (r > .5) px.dot(g, x - s * .4, y - s * .5, C[Math.floor(r * C.length)].lt);
    if (o.berries && u > .8) for (let i = 0; i < 5; i++) px.dot(g, ox + (R() - .5) * rx * 1.4, oy - ry * (.5 + R()), o.berries);
  };
}
function cornPaint(g, k, v, f, ox, oy) {   // a few dry corn stalks with drooping leaves and ears
  const R = E.rng(v * 47 + 2), u = M * k, C = TT('#c8a860'), D = TT('#a8884a');
  const n = u < .5 ? 3 : 5;
  for (let i = 0; i < n; i++) {
    const x = ox + (i - (n - 1) / 2) * .45 * u + (R() - .5) * .2 * u, h = (2.1 + R() * .5) * u, top = oy - h;
    px.line(g, x, oy, x + (R() - .5) * u * .2, top, D.sh, Math.max(1, Math.round(u * .07)));
    if (u > .25) for (let j = 0; j < 4; j++) { const y = oy - h * (.3 + j * .17), s = j % 2 ? 1 : -1, L = (.5 + R() * .4) * u; px.line(g, x, y, x + s * L, y + L * .35, (j % 2 ? C : D).base, 1); px.line(g, x + s * L, y + L * .35, x + s * L * 1.2, y + L * .8, D.sh, 1); }
    if (u > .4) { px.rect(g, x - Math.max(1, u * .06), top - u * .2, Math.max(1, u * .12), u * .3, C.lt); if (R() < .6) { px.ell(g, x + u * .1, oy - h * .55, Math.max(1, u * .08), Math.max(1, u * .2), '#d8b048'); } }
  }
}
function rockPaint(o) {
  return (g, k, v, f, ox, oy) => {
    const R = E.rng(v * 89 + 4), u = M * k, r = o.r * (.7 + R() * .6) * u, h = r * (o.flat || .75), C = TT(o.c || '#8a8278'), pts = [];
    for (let i = 0; i < 9; i++) { const a = Math.PI + i / 8 * Math.PI, rr = r * (.75 + R() * .35); pts.push([ox + Math.cos(a) * rr * 1.1, oy + Math.sin(a) * h * (.8 + R() * .3)]); }
    pts.push([ox + r * 1.1, oy]); pts.unshift([ox - r * 1.1, oy]);
    px.poly(g, pts, C.sh); if (r > 2) { px.poly(g, pts.map(p => [lerp(p[0], ox - r * .25, .25), lerp(p[1], oy - h * .5, .25) - .5]), C.base); px.poly(g, pts.slice(1, 5).map(p => [lerp(p[0], ox - r * .4, .45), lerp(p[1], oy - h * .7, .45)]), C.lt); }
    if (o.moss && r > 3) for (let i = 0; i < 6; i++) px.dot(g, ox - r * .6 + R() * r * .9, oy - h * (.6 + R() * .3), R() < .5 ? '#6a7a3a' : '#5a6a32');
    if (o.snow && r > 1.5) { px.poly(g, pts.slice(2, 8).map(p => [p[0], p[1] - .3]).concat([[ox + r * .5, oy - h * .55], [ox - r * .5, oy - h * .55]]), '#e8eef4'); }
    if (r > 2) px.line(g, ox - r * 1.1, oy - 1, ox + r * 1.1, oy - 1, C.deep);
  };
}
function logPaint(o) {
  return (g, k, v, f, ox, oy) => {
    const R = E.rng(v * 61 + 9), u = M * k, L = o.len * (.8 + R() * .4) * u, r = Math.max(1, o.r * u), C = TT(o.c || '#6a5040'), ang = (f % 2 ? .25 : -.18), cx = Math.cos(ang) * L / 2, cy = Math.sin(ang) * L / 2 * .3;
    const a = [ox - cx, oy - r - cy], b = [ox + cx, oy - r + cy];
    px.line(g, a[0], a[1], b[0], b[1], C.sh, r * 2); px.line(g, a[0], a[1] - r * .4, b[0], b[1] - r * .4, C.base, Math.max(1, r * 1.1)); if (r > 1.5) px.line(g, a[0], a[1] - r * .75, b[0], b[1] - r * .75, C.lt, 1);
    px.disc(g, b[0], b[1], r, TT('#a8885a').base); if (r > 2) px.disc(g, b[0], b[1], r * .5, TT('#a8885a').sh);
    if (o.snow) px.line(g, a[0], a[1] - r, b[0], b[1] - r, '#eef2f6', Math.max(1, r * .6));
    if (o.moss && r > 2) for (let i = 0; i < 5; i++) px.dot(g, lerp(a[0], b[0], R()), lerp(a[1], b[1], R()) - r * .7, '#6a7a3a');
  };
}
/** a building block: a box with a pitched roof, planks, a door and a window (the barn, the farmhouse, the trap house) */
function housePaint(o) {
  return (g, k, v, f, ox, oy) => {
    const u = M * k, W = o.w * u, H = o.h * u, RH = o.roof * u, D = o.d * u * .35, C = TT(o.wall), Rf = TT(o.roofC), tr = TT(o.trim || '#e8e0d0');
    const x0 = ox - W / 2, y0 = oy - H;
    px.poly(g, [[x0 + W, oy], [x0 + W + D, oy - D * .5], [x0 + W + D, y0 - D * .5], [x0 + W, y0]], C.sh);   // the side wall
    px.rect(g, x0, y0, W, H, C.base);
    if (u > .3) for (let x = x0 + Math.max(2, u * .6); x < x0 + W; x += Math.max(2, u * .6)) px.line(g, x, y0 + 1, x, oy - 1, C.sh, 1);
    px.poly(g, [[x0 - u * .3, y0], [ox, y0 - RH], [x0 + W + u * .3, y0]], Rf.sh); px.poly(g, [[x0 + u * .2, y0 - 1], [ox, y0 - RH + 1], [ox, y0 - 1]], Rf.base);
    px.poly(g, [[ox, y0 - RH], [ox + D, y0 - RH - D * .5], [x0 + W + D + u * .3, y0 - D * .5], [x0 + W + u * .3, y0]], Rf.lt);
    if (o.barn && u > .25) { const dw = W * .36, dh = H * .62; px.rect(g, ox - dw / 2, oy - dh, dw, dh, C.deep); px.line(g, ox - dw / 2, oy - dh, ox + dw / 2, oy, tr.base, Math.max(1, u * .15)); px.line(g, ox + dw / 2, oy - dh, ox - dw / 2, oy, tr.base, Math.max(1, u * .15)); px.rect(g, ox - dw / 2, oy - dh, dw, Math.max(1, u * .15), tr.base); px.rect(g, ox - u * .6, y0 - RH * .45, u * 1.2, u * .9, C.deep); }
    if (o.door && u > .25) { px.rect(g, ox - W * .3, oy - H * .7, W * .16, H * .7, C.deep); px.rect(g, ox + W * .1, y0 + H * .25, W * .22, H * .28, '#3a4a5a'); px.rect(g, ox + W * .1, y0 + H * .25, W * .22, Math.max(1, u * .1), tr.base); if (o.lit) px.rect(g, ox + W * .12, y0 + H * .28, W * .18, H * .22, '#f0c060'); }
    if (o.porch && u > .25) { px.rect(g, x0 - u * .4, oy - u * .25, W + u * .8, Math.max(1, u * .25), TT('#8a6a4a').base); for (const px0 of [x0, x0 + W]) px.rect(g, px0 - u * .1, oy - H * .62, Math.max(1, u * .2), H * .62, TT('#8a6a4a').sh); px.rect(g, x0 - u * .4, oy - H * .66, W + u * .8, Math.max(1, u * .3), Rf.base); }
    if (o.trapSlot && u > .25) px.rect(g, x0 + W * .1, y0 + H * .2, W * .8, H * .16, '#1a1410');
  };
}
function fencePaint(g, k, v, f, ox, oy) {   // a split-rail section (8 m) seen near side-on
  const u = M * k, C = TT('#7a6450'), L = 4 * u;
  for (const sx of [-1, 1]) px.rect(g, ox + sx * L - Math.max(1, u * .08), oy - 1.3 * u, Math.max(1, u * .16), 1.3 * u, C.sh);
  for (const hz of [.55, 1.05]) { px.line(g, ox - L, oy - hz * u, ox + L, oy - hz * u + (v % 2 ? u * .1 : -u * .05), C.base, Math.max(1, Math.round(u * .12))); if (u > 1) px.line(g, ox - L, oy - hz * u - 1, ox + L, oy - hz * u - 1, C.lt, 1); }
}
function haybalePaint(g, k, v, f, ox, oy) { const u = M * k, r = .7 * u, C = TT('#d8b45a'); px.ell(g, ox, oy - r, r * 1.3, r, C.sh); px.ell(g, ox - r * .2, oy - r * 1.05, r * 1.05, r * .8, C.base); if (u > .5) { px.ell(g, ox + r * .55, oy - r, r * .45, r * .75, C.lt); px.line(g, ox - r * 1.2, oy - r * 1.2, ox + r * 1.2, oy - r * 1.2, C.sh, 1); } }
function lodgePaint(g, k, v, f, ox, oy) {   // a beaver lodge: a mound of sticks and mud
  const R = E.rng(v + 50), u = M * k, w = 3.2 * u, h = 1.8 * u, C = TT('#5a4632');
  px.ell(g, ox, oy - h * .2, w, h, C.sh); px.ell(g, ox - w * .15, oy - h * .35, w * .8, h * .75, C.base);
  if (u > .3) for (let i = 0; i < 40; i++) { const a = R() * Math.PI, rr = R() * .95, x = ox + Math.cos(a) * w * rr, y = oy - h * .2 - Math.sin(a) * h * rr, L = (.3 + R() * .5) * u, an = R() * Math.PI; px.line(g, x, y, x + Math.cos(an) * L, y + Math.sin(an) * L * .4, R() < .5 ? C.deep : C.lt, 1); }
  px.ell(g, ox - w * .3, oy - h * .9, w * .4, h * .2, '#eef2f6');
}
function driftPaint(g, k, v, f, ox, oy) { const R = E.rng(v + 70), u = M * k, w = (2 + R() * 2) * u, h = (.5 + R() * .4) * u; px.ell(g, ox, oy, w, h, '#c8d4e0'); px.ell(g, ox - w * .2, oy - h * .2, w * .8, h * .75, '#e8eef4'); if (u > .5) px.ell(g, ox - w * .35, oy - h * .45, w * .35, h * .3, '#ffffff'); }
function trapPaint(g, k, v, f, ox, oy) { housePaint({ w: 2.4, h: 1.4, roof: .5, d: 2, wall: '#6a6a5a', roofC: '#4a4a3e', trapSlot: true })(g, k, v, f, ox, oy); }
function standPaint(g, k, v, f, ox, oy) {   // a ladder tree stand seen from afar (other vantages)
  const u = M * k, C = TT('#4a4a42');
  px.line(g, ox - .3 * u, oy, ox - .3 * u, oy - 4.5 * u, C.sh, Math.max(1, Math.round(u * .1))); px.line(g, ox + .3 * u, oy, ox + .3 * u, oy - 4.5 * u, C.sh, Math.max(1, Math.round(u * .1)));
  for (let i = 1; i < 9; i++) px.line(g, ox - .3 * u, oy - i * .5 * u, ox + .3 * u, oy - i * .5 * u, C.base, 1);
  px.rect(g, ox - .6 * u, oy - 4.6 * u, 1.2 * u, Math.max(1, .15 * u), C.base); px.rect(g, ox - .6 * u, oy - 5.4 * u, Math.max(1, .1 * u), .8 * u, C.sh);
}
function signPaint(g, k, v, f, ox, oy) { const u = M * k, C = TT('#8a6a44'); px.rect(g, ox - Math.max(1, u * .06), oy - 1.4 * u, Math.max(1, u * .12), 1.4 * u, C.sh); px.rect(g, ox - .7 * u, oy - 1.6 * u, 1.4 * u, .6 * u, C.base); if (u > 1) px.rect(g, ox - .5 * u, oy - 1.4 * u, u, 1, C.lt); }
function bermPaint(g, k, v, f, ox, oy) { const u = M * k, w = 6 * u, h = 2.2 * u, C = TT('#7a6a48'); px.poly(g, [[ox - w, oy], [ox - w * .6, oy - h], [ox + w * .6, oy - h], [ox + w, oy]], C.sh); px.poly(g, [[ox - w * .9, oy], [ox - w * .55, oy - h + 1], [ox + w * .5, oy - h + 1], [ox + w * .2, oy]], C.base); if (u > .5) for (let i = 0; i < 12; i++) px.dot(g, ox - w * .7 + i * w * .12, oy - h * .7 + (i % 3), '#6a7a3a'); }

/* ---------- the props ---------- */
const AUTUMN = [['#a8421c', '#c8682a', '#e0a03a'], ['#b8301e', '#d84a28', '#e87a3a'], ['#c87a1a', '#e0a02a', '#f0c84a'], ['#8a5a1e', '#b07a2a', '#c8a03a']];
const propDef = (id, o) => { def('prop', id, o); IMP.define(id, { size: o.size, variants: o.variants || 1, facings: o.facings || 1, paint: o.paint, shape: o.shape, params: o.params, scale: o.shapeScale, pitch: o.pitch }); };
propDef('oak', { size: [6 * M, 17 * M], variants: 4, wind: .8, shadow: 4.5, occ: occTrunk(.32, 9), paint: broadleaf({ h: 15, crown: [5.2, 7.5], trunk: .32, pal: [AUTUMN[0], AUTUMN[3], AUTUMN[0].concat(['#7a6a2a']), AUTUMN[2]], clumps: 30, seed: 1 }) });
propDef('maple', { size: [5 * M, 16 * M], variants: 3, wind: .9, shadow: 4, occ: occTrunk(.26, 8), paint: broadleaf({ h: 14, crown: [4.4, 7], trunk: .26, pal: [AUTUMN[1], ['#c02a1e', '#e0482a', '#f08a3a'], AUTUMN[2]], clumps: 28, seed: 2 }) });
propDef('birch', { size: [3.5 * M, 15 * M], variants: 3, wind: 1.2, shadow: 2.5, occ: occTrunk(.16, 9), paint: broadleaf({ h: 13, crown: [3, 5.5], trunk: .16, bark: '#e8e4dc', birch: true, pal: [['#c8a21e', '#e8c83a', '#f8e87a'], ['#b8962a', '#d8b83a', '#f0d860']], clumps: 20, clump: .95, holes: true, seed: 3 }) });
propDef('aspen', { size: [3 * M, 14 * M], variants: 4, wind: 1.4, shadow: 2.2, occ: occTrunk(.15, 8), paint: broadleaf({ h: 12.5, crown: [2.6, 6.2], trunk: .15, bark: '#d8d8cc', birch: true, pal: [['#c8901a', '#e8b82a', '#f8e060'], ['#d0a02a', '#ecc43a', '#fae880'], ['#a89a2a', '#c8c03a', '#e0e070']], clumps: 22, clump: .85, holes: true, seed: 4 }) });
propDef('spruce', { size: [3.4 * M, 19 * M], variants: 3, wind: .3, shadow: 3, occ: occTrunk(.25, 14), paint: conifer({ h: 17, w: 3.2, tiers: 9, skirt: .04, pal: ['#2a4a3a', '#24443a', '#30503e'] }) });
propDef('fir', { size: [2.8 * M, 16 * M], variants: 3, wind: .3, shadow: 2.6, occ: occTrunk(.22, 12), paint: conifer({ h: 14, w: 2.6, tiers: 8, skirt: .05, pal: ['#2e5240', '#365a44', '#2a4a3c'] }) });
propDef('snowspruce', { size: [3.2 * M, 17 * M], variants: 3, wind: .2, shadow: 3, occ: occTrunk(.24, 12), paint: conifer({ h: 15, w: 3, tiers: 9, skirt: .03, snow: true, pal: ['#22382e', '#2a4034', '#1e3428'] }) });
propDef('blackspruce', { size: [1.6 * M, 13 * M], variants: 4, wind: .2, shadow: 1.6, occ: occTrunk(.14, 9), paint: conifer({ h: 11, w: 1.4, tiers: 10, skirt: .1, snow: true, pal: ['#1e2e28', '#24342c', '#1a2a24'] }) });
propDef('tamarack', { size: [2.6 * M, 15 * M], variants: 3, wind: .5, shadow: 2, occ: occTrunk(.16, 10), paint: conifer({ h: 13, w: 2.4, tiers: 9, skirt: .1, sparse: true, pal: ['#c8841e', '#d89a2a', '#b8781a'] }) });
propDef('snag', { size: [2.2 * M, 10 * M], variants: 4, shadow: .8, occ: occTrunk(.2, 7), paint: snag({ h: 8, snow: true, c: '#4a4442' }) });
propDef('bush', { size: [1.8 * M, 1.8 * M], variants: 4, wind: .5, paint: clumpPaint({ w: 1.6, h: 1.6, clumps: 11, pal: ['#6a5a2a', '#8a6a2a', '#a87a2a'], seed: 6 }) });
propDef('sumac', { size: [1.6 * M, 1.8 * M], variants: 3, wind: .6, paint: clumpPaint({ w: 1.4, h: 1.7, clumps: 10, pal: ['#a8281e', '#c83a22', '#e05a2a'], seed: 7 }) });
propDef('juniper', { size: [1.6 * M, 1.4 * M], variants: 3, paint: clumpPaint({ w: 1.5, h: 1.2, clumps: 10, pal: ['#2e4a3a', '#3a5a44', '#4a6a4a'], berries: '#6a7ab0', seed: 8 }) });
propDef('willow', { size: [1.6 * M, 2 * M], variants: 3, wind: .6, paint: clumpPaint({ blades: 22, w: 1.2, h: 2, thick: .07, pal: ['#8a3a2a', '#a84a30', '#6a3024'], seed: 9 }) });
propDef('tallgrass', { size: [1 * M, 1 * M], variants: 4, wind: 1.6, bias: 4, paint: clumpPaint({ blades: 22, w: .6, h: .85, pal: ['#8a8a3e', '#a89a4a', '#6e7a34'], heads: '#c8b878', seed: 10 }) });
propDef('goldgrass', { size: [1 * M, .9 * M], variants: 4, wind: 1.6, bias: 4, paint: clumpPaint({ blades: 14, w: .7, h: .8, pal: ['#c8a040', '#e0c060', '#a88a3a'], heads: '#f0d890', seed: 11 }) });
propDef('reeds', { size: [1 * M, 2 * M], variants: 4, wind: 1.2, bias: 4, paint: clumpPaint({ blades: 16, w: .8, h: 1.9, thick: .05, pal: ['#a88a5a', '#8a7448', '#c8a86a'], heads: '#5a3a22', seed: 12 }) });
propDef('fern', { size: [1 * M, .8 * M], variants: 3, wind: .8, bias: 4, paint: clumpPaint({ w: .9, h: .7, clumps: 8, clump: .35, pal: ['#a87a2a', '#c89a3a', '#8a6a2a'], seed: 13 }) });
propDef('corn', { size: [1.4 * M, 2.8 * M], variants: 6, wind: 1, bias: 6, paint: cornPaint });
propDef('rock', { size: [2 * M, 1.8 * M], variants: 5, shadow: 1.2, occ: occBall(.95, .45), paint: rockPaint({ r: 1.1, moss: true }) });
propDef('boulder', { size: [3.4 * M, 3 * M], variants: 4, shadow: 2, occ: occBall(1.7, .9), paint: rockPaint({ r: 2, c: '#8a8680' }) });
propDef('talus', { size: [1.6 * M, 1.2 * M], variants: 5, occ: occBall(.7, .3), paint: rockPaint({ r: .8, flat: .6, c: '#9a948c' }) });
propDef('snowrock', { size: [2 * M, 1.6 * M], variants: 4, shadow: 1, occ: occBall(.9, .4), paint: rockPaint({ r: 1.1, c: '#7a7a80', snow: true }) });
propDef('libraryrock', { size: [2 * M, 1.6 * M], variants: 3, occ: occBall(.9, .45), shape: 'rock', params: v => ({ r: 7.5, seed: v + 1 }), shapeScale: 1.9, pitch: 6 });
propDef('log', { size: [3.5 * M, 1 * M], variants: 3, facings: 2, occ: p => [{ k: 'cap', a: [p.x - 1.6 * M, p.y, p.z + .35 * M], b: [p.x + 1.6 * M, p.y, p.z + .35 * M], r: .35 * M }], paint: logPaint({ len: 4, r: .32, moss: true }) });
propDef('snowlog', { size: [3.5 * M, 1 * M], variants: 3, facings: 2, occ: p => [{ k: 'cap', a: [p.x - 1.6 * M, p.y, p.z + .35 * M], b: [p.x + 1.6 * M, p.y, p.z + .35 * M], r: .35 * M }], paint: logPaint({ len: 4, r: .32, snow: true, c: '#5a4a40' }) });
propDef('stump', { size: [1 * M, 1 * M], variants: 2, occ: occTrunk(.4, .7), paint: (g, k, v, f, ox, oy) => { const u = M * k, C = TT('#6a5040'); px.rect(g, ox - .4 * u, oy - .7 * u, .8 * u, .7 * u, C.sh); px.rect(g, ox - .4 * u, oy - .7 * u, .45 * u, .7 * u, C.base); px.ell(g, ox, oy - .7 * u, .4 * u, .15 * u, '#b8945a'); } });
propDef('fence', { size: [4.5 * M, 1.5 * M], variants: 2, facings: 1, bias: 6, paint: fencePaint });
propDef('haybale', { size: [1.2 * M, 1.5 * M], variants: 1, shadow: .8, occ: occBall(.75, .7), paint: haybalePaint });
propDef('barn', { size: [9 * M, 12 * M], shadow: 7, occ: occBox(6, 5, 9), paint: housePaint({ w: 12, h: 6.5, roof: 4, d: 10, wall: '#a8321e', roofC: '#4a4a52', trim: '#f0e8dc', barn: true }) });
propDef('farmhouse', { size: [7 * M, 9 * M], shadow: 5, occ: occBox(5, 4, 7), paint: housePaint({ w: 9, h: 4.5, roof: 3.2, d: 8, wall: '#e8dcc0', roofC: '#5a4a44', door: true, porch: true, lit: true }) });
propDef('shed', { size: [3 * M, 4 * M], shadow: 2, occ: occBox(1.8, 1.6, 3), paint: housePaint({ w: 3.6, h: 2.4, roof: 1.2, d: 3, wall: '#7a6450', roofC: '#4a3e36', door: true }) });
propDef('traphouse', { size: [2 * M, 2.2 * M], occ: occBox(1.2, 1, 1.4), paint: trapPaint });
propDef('lodge', { size: [3.6 * M, 2.4 * M], shadow: 2, occ: occBall(2.4, .6), paint: lodgePaint });
propDef('drift', { size: [3.5 * M, 1 * M], variants: 4, bias: 4, paint: driftPaint });
propDef('stand', { size: [1 * M, 5.6 * M], paint: standPaint });
propDef('sign', { size: [1 * M, 1.8 * M], paint: signPaint });
propDef('berm', { size: [6.5 * M, 2.4 * M], occ: occBox(6, 1.5, 2.2), paint: bermPaint });
propDef('lowberm', { size: [6.5 * M, 1.2 * M], occ: occBox(6, 1.2, .95), paint: (g, k, v, f, ox, oy) => { const u = M * k, w = 6 * u, h = .95 * u, C = TT('#7a6a48'); px.poly(g, [[ox - w, oy], [ox - w * .7, oy - h], [ox + w * .7, oy - h], [ox + w, oy]], C.sh); px.poly(g, [[ox - w * .9, oy], [ox - w * .65, oy - h + 1], [ox + w * .6, oy - h + 1], [ox + w * .3, oy]], C.base); } });

/** occluder volumes a ray might hit: the nearest t (forward-distance parameter) or null */
function rayVolume(o, d, v) {
  if (v.k === 'sph') return raySphere(o, d, [v.x, v.y, v.z], v.r);
  if (v.k === 'cyl') {   // a vertical cylinder from z0 to z1
    const ox = o.x - v.x, oy = o.y - v.y, a = d.dx * d.dx + d.dy * d.dy, b = 2 * (ox * d.dx + oy * d.dy), c = ox * ox + oy * oy - v.r * v.r, D = b * b - 4 * a * c; if (D < 0 || a < 1e-9) return null;
    const t = (-b - Math.sqrt(D)) / (2 * a); if (t < 0) return null; const z = o.z + d.dz * t; return z >= v.z0 && z <= v.z1 ? t : null;
  }
  if (v.k === 'cap') return rayCapsule(o, d, v.a, v.b, v.r);
  if (v.k === 'box') {   // a box turned by a about z
    const ca = Math.cos(-v.a || 0), sa = Math.sin(-v.a || 0), lx = (o.x - v.x) * ca - (o.y - v.y) * sa, ly = (o.x - v.x) * sa + (o.y - v.y) * ca, dx = d.dx * ca - d.dy * sa, dy = d.dx * sa + d.dy * ca;
    let t0 = 0, t1 = Infinity; for (const [p, q, lo, hi] of [[lx, dx, -v.hx, v.hx], [ly, dy, -v.hy, v.hy], [o.z, d.dz, v.z0, v.z1]]) { if (Math.abs(q) < 1e-9) { if (p < lo || p > hi) return null; continue; } let a = (lo - p) / q, b = (hi - p) / q; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return null; }
    return t0 > 0 ? t0 : null;
  }
  return null;
}
/** a ray against an ellipsoid with axes ax (three unit vectors) and radii rad: the entry t, or null */
function rayEllipsoid(o, d, c, ax, rad) {
  const w = [o.x - c[0], o.y - c[1], o.z - c[2]], dv = [d.dx, d.dy, d.dz], O = [], D = [];
  for (let i = 0; i < 3; i++) { const a = ax[i]; O.push((w[0] * a[0] + w[1] * a[1] + w[2] * a[2]) / rad[i]); D.push((dv[0] * a[0] + dv[1] * a[1] + dv[2] * a[2]) / rad[i]); }
  const A = D[0] * D[0] + D[1] * D[1] + D[2] * D[2], B = 2 * (O[0] * D[0] + O[1] * D[1] + O[2] * D[2]), C = O[0] * O[0] + O[1] * O[1] + O[2] * O[2] - 1, disc = B * B - 4 * A * C;
  if (disc < 0 || A < 1e-12) return null; const sq = Math.sqrt(disc), t = (-B - sq) / (2 * A); return t >= 0 ? t : ((-B + sq) / (2 * A) >= 0 ? 0 : null);
}
function raySphere(o, d, c, r) { const ox = o.x - c[0], oy = o.y - c[1], oz = o.z - c[2], a = d.dx * d.dx + d.dy * d.dy + d.dz * d.dz, b = 2 * (ox * d.dx + oy * d.dy + oz * d.dz), cc = ox * ox + oy * oy + oz * oz - r * r, D = b * b - 4 * a * cc; if (D < 0) return null; const s = Math.sqrt(D), t = (-b - s) / (2 * a); return t >= 0 ? t : ((-b + s) / (2 * a) >= 0 ? 0 : null); }
function rayCapsule(o, d, A, B, r) {
  // the nearest t where the ray comes within r of the segment AB (sampled, then refined)
  const best = { t: null, m: Infinity }, dl = Math.hypot(d.dx, d.dy, d.dz);
  const segD = t => { const p = [o.x + d.dx * t, o.y + d.dy * t, o.z + d.dz * t], vx = B[0] - A[0], vy = B[1] - A[1], vz = B[2] - A[2], L = vx * vx + vy * vy + vz * vz; let u = L ? ((p[0] - A[0]) * vx + (p[1] - A[1]) * vy + (p[2] - A[2]) * vz) / L : 0; u = clamp(u, 0, 1); return Math.hypot(A[0] + vx * u - p[0], A[1] + vy * u - p[1], A[2] + vz * u - p[2]); };
  // the closest approach of the ray to the segment's line
  const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], wx = o.x - A[0], wy = o.y - A[1], wz = o.z - A[2];
  const a = d.dx * d.dx + d.dy * d.dy + d.dz * d.dz, b = d.dx * ux + d.dy * uy + d.dz * uz, c = ux * ux + uy * uy + uz * uz, dd = d.dx * wx + d.dy * wy + d.dz * wz, e = ux * wx + uy * wy + uz * wz, den = a * c - b * b;
  let tc = den > 1e-9 ? (b * e - c * dd) / den : -dd / a; if (tc < 0) tc = 0;
  let lo = Math.max(0, tc - (r + Math.sqrt(c)) * 2 / dl), hi = tc + (r + Math.sqrt(c)) * 2 / dl;
  if (segD(tc) > r) { // maybe the segment's ends are nearer than the line's closest point
    let m = Infinity, tm = tc; for (let i = 0; i <= 24; i++) { const t = lo + (hi - lo) * i / 24, q = segD(t); if (q < m) { m = q; tm = t; } }
    if (m > r) return null; tc = tm;
  }
  // walk back from the inside to the surface
  let tin = tc, tout = lo; if (segD(tout) <= r) return tout;
  for (let i = 0; i < 20; i++) { const mid = (tin + tout) / 2; if (segD(mid) <= r) tin = mid; else tout = mid; }
  return tin;
}
