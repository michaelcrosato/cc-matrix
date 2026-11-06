(() => { const E=My3D2dge,G=(window.GAME ||= {});
const TissueField=G.TissueField,matId=G.matId;
// A site recipe: the abdomen. Design space is 426 x 240 about the screen's centre; a bigger screen only shows more drape.
function bakeAbdomen(W, H, seed = 11) { const F = new TissueField(W, H, seed), cx = W / 2, cy = H / 2 - 4, n = F.noise, rx = 171, ry = 91;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2, fold = Math.sin(x * .09 + 1.6 * Math.sin(y * .05)) * 1.6 + Math.sin(y * .17 + x * .03) * .8;
    if (d < 1) { F.h[i] = -16 + 12 * d * d + Math.sin(x * .05 + y * .03) * 1.4; F.m[i] = matId('wall'); }            // the cavity
    else if (d < 1.28) { const e = (d - 1) / .28; F.h[i] = 4 + 7 * Math.sin(e * Math.PI); F.m[i] = matId('skin'); }  // lips of skin
    else { F.h[i] = 6 + fold; F.m[i] = matId('drape'); } }                                                            // drapes to any screen's edge
  F.blob(cx - rx * .55, cy - ry * .5, rx * .55, ry * .55, -.3, 17, 'liver', { base: -11, warp: 12 });
  for (let i = 0; i < 9; i++) { const a = n.R() * 6.28, r = .55 + n.R() * .32; F.blob(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r, 9 + n.R() * 14, 7 + n.R() * 9, n.R() * 3, 8, 'fat', { base: -10, warp: 8 }); }
  const coil = (x0, y0, len, dir, r) => { const pts = [[x0, y0]]; let a = dir, x = x0, y = y0; for (let i = 0; i < len; i++) { a += (n.R() - .5) * 1.5 + Math.sin(i * .9) * .5; x += Math.cos(a) * r * 1.3; y += Math.sin(a) * r * 1.3; if (((x - cx) / (rx * .92)) ** 2 + ((y - cy) / (ry * .92)) ** 2 > 1) { a += 2.4; x += Math.cos(a) * r; y += Math.sin(a) * r; } pts.push([x, y]); } return pts; };
  F.tube(coil(cx + rx * .05, cy - ry * .25, 34, .2, 9), 11, 14, 'bowel', { base: -8 }); F.tube(coil(cx + rx * .45, cy + ry * .25, 26, 2.6, 9), 10, 15, 'bowel', { base: -7 }); F.tube(coil(cx - rx * .35, cy + ry * .45, 22, -.3, 9), 10, 15, 'bowel', { base: -6 });
  const veins = (x, y, a, len, r, mat) => { const pts = [[x, y]]; for (let i = 0; i < len; i++) { a += (n.R() - .5) * .8; x += Math.cos(a) * 7; y += Math.sin(a) * 7; if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > .96) break; pts.push([x, y]); if (r > 1.2 && n.R() < .22) veins(x, y, a + (n.R() < .5 ? .9 : -.9), len * .5 | 0, r * .7, mat); } F.tube(pts, r, 1.6, mat, { add: true, pulse: mat === 'artery' ? .35 : 0 }); };
  veins(cx - rx * .7, cy - ry * .05, -.2, 16, 2.2, 'vessel'); veins(cx + rx * .7, cy - ry * .6, 2.4, 14, 2, 'artery'); veins(cx + rx * .1, cy + ry * .75, -1.5, 12, 1.8, 'vessel');
  for (const a of [-.45, .5, 2.7, 3.6]) { const ex = cx + Math.cos(a) * rx * 1.02, ey = cy + Math.sin(a) * ry * 1.02, ox = cx + Math.cos(a) * rx * 1.5, oy = cy + Math.sin(a) * ry * 1.5; F.tube([[ex, ey], [ox, oy]], 4, 5, 'steel', { base: 10 }); F.tube([[ex - Math.sin(a) * 9, ey + Math.cos(a) * 9], [ex + Math.sin(a) * 9, ey - Math.cos(a) * 9]], 3, 5, 'steel', { base: 10 }); } // retractors
  F.finish(1.1); return F; }
Object.assign(G,{bakeAbdomen});
})();
