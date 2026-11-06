// Operative sites: recipes on the tissue painter (section 16). Design space 426x240 about the screen centre.
(() => {
const E = My3D2dge, G = (window.GAME ||= {});
const base = (F, W, H, cavMat, cavFn) => { const cx = W / 2, cy = H / 2 - 4, rx = 171, ry = 91;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2, fold = Math.sin(x * .09 + 1.6 * Math.sin(y * .05)) * 1.6 + Math.sin(y * .17 + x * .03) * .8;
    if (d < 1) { F.h[i] = -16 + 12 * d * d + (cavFn ? cavFn(x, y, d) : Math.sin(x * .05 + y * .03) * 1.4); F.m[i] = G.matId(cavMat); }
    else if (d < 1.28) { const e = (d - 1) / .28; F.h[i] = 4 + 7 * Math.sin(e * Math.PI); F.m[i] = G.matId('skin'); }
    else { F.h[i] = 6 + fold; F.m[i] = G.matId('drape'); } }
  return { cx, cy, rx, ry }; };
const veins = (F, c, x, y, a, len, r, mat, n) => { const pts = [[x, y]]; for (let i = 0; i < len; i++) { a += (n.R() - .5) * .8; x += Math.cos(a) * 7; y += Math.sin(a) * 7; if (((x - c.cx) / c.rx) ** 2 + ((y - c.cy) / c.ry) ** 2 > .96) break; pts.push([x, y]); if (r > 1.2 && n.R() < .22) veins(F, c, x, y, a + (n.R() < .5 ? .9 : -.9), len * .5 | 0, r * .7, mat, n); } F.tube(pts, r, 1.6, mat, { add: true, pulse: mat === 'artery' ? .35 : 0 }); };
const retractors = (F, c, angs) => { for (const a of angs) { const ex = c.cx + Math.cos(a) * c.rx * 1.02, ey = c.cy + Math.sin(a) * c.ry * 1.02, ox = c.cx + Math.cos(a) * c.rx * 1.5, oy = c.cy + Math.sin(a) * c.ry * 1.5; F.tube([[ex, ey], [ox, oy]], 4, 5, 'steel', { base: 10 }); F.tube([[ex - Math.sin(a) * 9, ey + Math.cos(a) * 9], [ex + Math.sin(a) * 9, ey - Math.cos(a) * 9]], 3, 5, 'steel', { base: 10 }); } };
const R = {
  abdomen: (W, H, seed) => G.bakeAbdomen0(W, H, seed),
  forearm(W, H, seed) { const F = new G.TissueField(W, H, seed), c = base(F, W, H, 'muscle'), n = F.noise;
    for (let i = 0; i < 9; i++) F.blob(c.cx - 120 + n.R() * 240, c.cy - 70 + i * 17, 70 + n.R() * 50, 8 + n.R() * 5, (n.R() - .5) * .12, 9, 'muscle', { base: -12, warp: 5 });
    for (let i = 0; i < 4; i++) F.tube([[c.cx - 150, c.cy - 50 + i * 34], [c.cx - 40, c.cy - 46 + i * 34 + n.R() * 6], [c.cx + 60, c.cy - 52 + i * 34], [c.cx + 150, c.cy - 48 + i * 34]], 4, 6, 'tendon', { base: -9 });
    veins(F, c, c.cx - 140, c.cy + 10, .1, 18, 2.2, 'vessel', n); veins(F, c, c.cx + 100, c.cy - 60, 2.5, 12, 1.8, 'artery', n); retractors(F, c, [-.6, .6, 2.6, 3.7]); F.finish(1.2); return F; },
  flank(W, H, seed) { const F = new G.TissueField(W, H, seed), c = base(F, W, H, 'wall'), n = F.noise;
    for (let i = 0; i < 6; i++) F.blob(c.cx - 100 + i * 40, c.cy + (i % 2) * 20 - 10, 60, 18, .5 + i * .05, 10, 'muscle', { base: -12, warp: 8 });
    for (let i = 0; i < 7; i++) F.blob(c.cx + (n.R() - .5) * 280, c.cy + (n.R() - .5) * 120, 14 + n.R() * 16, 10 + n.R() * 8, n.R() * 3, 7, 'fat', { base: -10, warp: 7 });
    F.tube([[c.cx - 140, c.cy - 8], [c.cx, c.cy - 4], [c.cx + 150, c.cy + 6]], 6, 4, 'bowel', { base: -10, add: true });
    veins(F, c, c.cx - 100, c.cy + 40, -.3, 14, 2, 'vessel', n); retractors(F, c, [-.5, .5, 2.7, 3.6]); F.finish(1.1); return F; },
  heart(W, H, seed) { const F = new G.TissueField(W, H, seed), c = base(F, W, H, 'wall'), n = F.noise;
    F.blob(c.cx, c.cy + 2, 118, 78, .2, 30, 'heart', { base: -14, warp: 6, pulse: .75 });
    for (let i = 0; i < 5; i++) F.blob(c.cx + (n.R() - .5) * 150, c.cy + (n.R() - .5) * 90, 22, 7, n.R() * 3, 6, 'fat', { base: -2, warp: 5, add: true });
    veins(F, c, c.cx - 90, c.cy - 20, .2, 20, 3, 'artery', n); veins(F, c, c.cx + 60, c.cy + 40, -2.4, 16, 2.6, 'artery', n); veins(F, c, c.cx, c.cy - 70, 1.5, 14, 2.4, 'vessel', n);
    for (const a of [-.2, 3.34]) F.tube([[c.cx + Math.cos(a) * c.rx * .95, c.cy + Math.sin(a) * c.ry * .95], [c.cx + Math.cos(a) * c.rx * 1.45, c.cy + Math.sin(a) * c.ry * 1.45]], 5, 6, 'bone', { base: 8 });
    retractors(F, c, [-1.57, 1.57]); F.finish(1); return F; },
  brain(W, H, seed) { const F = new G.TissueField(W, H, seed), c = base(F, W, H, 'brain'), n = F.noise;
    for (let k = 0; k < 14; k++) { const a0 = n.R() * 6.28, r0 = n.R() * 70, pts = []; let a = a0, x = c.cx + Math.cos(a0) * r0, y = c.cy + Math.sin(a0) * r0 * .6; for (let i = 0; i < 16; i++) { a += (n.R() - .5) * 2; x += Math.cos(a) * 9; y += Math.sin(a) * 7; if (((x - c.cx) / (c.rx * .85)) ** 2 + ((y - c.cy) / (c.ry * .85)) ** 2 > 1) break; pts.push([x, y]); } if (pts.length > 1) F.tube(pts, 8, 9, 'brain', { base: -9 }); }
    veins(F, c, c.cx - 80, c.cy, .3, 14, 1.2, 'vessel', n); veins(F, c, c.cx + 70, c.cy - 30, 2.3, 12, 1.2, 'artery', n); retractors(F, c, [-.5, .5, 2.7, 3.6]); F.finish(1); return F; },
  implant(W, H, seed) { const F = new G.TissueField(W, H, seed), c = base(F, W, H, 'wall'), n = F.noise;
    for (let i = 0; i < 6; i++) F.blob(c.cx - 120 + i * 48, c.cy + 50, 30, 14, .1, 8, 'fat', { base: -10, warp: 6 });
    F.blob(c.cx, c.cy, 86, 58, 0, 14, 'steel', { base: -10 }); F.blob(c.cx, c.cy, 70, 44, 0, 4, 'pcb', { base: 2, add: true });
    for (let i = 0; i < 8; i++) F.tube([[c.cx - 60 + i * 5, c.cy - 36], [c.cx - 60 + i * 5, c.cy + 36]], .9, 1, 'gold', { add: true });
    veins(F, c, c.cx - 150, c.cy + 40, 0, 10, 2, 'vessel', n); retractors(F, c, [-.5, .5, 2.7, 3.6]); F.finish(.8); return F; },
  mediastinum(W, H, seed) { const F = new G.TissueField(W, H, seed), c = base(F, W, H, 'wall'), n = F.noise;
    F.blob(c.cx - 20, c.cy + 20, 90, 60, .3, 24, 'heart', { base: -14, warp: 5, pulse: .75 });
    F.blob(c.cx + 30, c.cy - 28, 120, 46, -.15, 26, 'lav', { base: -12, warp: 14, pulse: .3 });
    for (let i = 0; i < 6; i++) F.blob(c.cx + (n.R() - .5) * 250, c.cy + (n.R() - .5) * 110, 12, 12, 0, 9, 'hush', { base: -4, add: true, warp: 4 });
    veins(F, c, c.cx - 40, c.cy - 50, .3, 18, 3, 'artery', n); veins(F, c, c.cx + 80, c.cy + 10, 2.4, 16, 2.6, 'vessel', n); retractors(F, c, [-1.57, 1.57, .2, 2.9]); F.finish(1); return F; },
};
G.bakeSite = (name, W, H, seed = 11) => (R[name] || R.abdomen)(W, H, seed);
G.SITE_NAMES = Object.keys(R);
})();
