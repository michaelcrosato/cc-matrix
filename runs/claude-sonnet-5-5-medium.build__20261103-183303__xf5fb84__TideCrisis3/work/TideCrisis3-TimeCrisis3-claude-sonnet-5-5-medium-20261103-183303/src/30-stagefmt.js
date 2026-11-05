// 30-stagefmt.js — stage/scene schema, the scene builder (`b`), environments and validators.
// A scene is data: slots, covers, waves, cues, objects, geometry. Designers add scenes without touching systems.
const ENVS = {
  harbor: { sky: ['#0b1026', '#1b2a52', '#4a3068'], fog: ['#1a2242', 260, 1300], ambient: .5, sun: { dir: [-.35, .45, .82], k: .42 }, stars: 1, moon: { yaw: -.3, pitch: .42, r: 9 }, skyline: [{ h: 46, col: '#141a38', seed: 3, lit: '#ffb347', drop: 0 }, { h: 26, col: '#1c2348', seed: 9, drop: 4 }], sea: { c1: '#173a66', c2: '#0a1830', spark: '#ffcf8a' }, fireworks: 1 },
  market: { sky: ['#1b1426', '#2a1d35', '#3a2a40'], fog: ['#2a2030', 300, 1000], ambient: .55, sun: { dir: [-.2, .1, .9], k: .3 }, skyline: [], sea: { c1: '#2a2030', c2: '#2a2030' } },
  yard: { sky: ['#0d1224', '#26294e', '#6b4a52'], fog: ['#2a2940', 300, 1500], ambient: .5, sun: { dir: [-.3, .5, .8], k: .38 }, stars: 1, skyline: [{ h: 34, col: '#181c34', seed: 5, lit: '#ffd34a' }], sea: { c1: '#173a66', c2: '#0a1830', spark: '#ffcf8a' } },
  canal: { sky: ['#0b1026', '#1b2a52', '#4a3068'], fog: ['#1a2242', 220, 1100], ambient: .5, sun: { dir: [-.35, .45, .82], k: .4 }, stars: 1, moon: { yaw: .3, pitch: .5, r: 8 }, skyline: [{ h: 40, col: '#161c3c', seed: 12, lit: '#ffb347' }], sea: { c1: '#14325a', c2: '#0a1830', spark: '#ffcf8a' } },
  harborMouth: { sky: ['#0a0e22', '#1f2c58', '#6a3a68'], fog: ['#1a2242', 300, 1600], ambient: .52, sun: { dir: [-.35, .45, .82], k: .42 }, stars: 1, moon: { yaw: 0, pitch: .38, r: 10 }, skyline: [{ h: 30, col: '#10152e', seed: 3, lit: '#ffb347' }], sea: { c1: '#173a66', c2: '#0a1830', spark: '#ffcf8a' } },
  storm: { sky: ['#10171b', '#1d2a30', '#31444a'], fog: ['#26343c', 180, 1100], ambient: .48, sun: { dir: [-.3, .3, .85], k: .3 }, skyline: [{ h: 40, col: '#1a2328', seed: 7, wide: 1 }], sea: { c1: '#1d3a48', c2: '#0c1a22', spark: '#a8c8d8' }, storm: 1 },
  loft: { sky: ['#1a1a1a', '#262320', '#38302a'], fog: ['#2a241e', 260, 900], ambient: .5, sun: { dir: [-.2, .1, .9], k: .28 }, skyline: [], sea: { c1: '#2a241e', c2: '#2a241e' } },
  cliff: { sky: ['#10171b', '#1d2a30', '#31444a'], fog: ['#26343c', 200, 1300], ambient: .46, sun: { dir: [-.3, .3, .85], k: .3 }, skyline: [{ h: 70, col: '#161e22', seed: 4, wide: 1 }], sea: { c1: '#1d3a48', c2: '#0c1a22', spark: '#a8c8d8' }, storm: 1 },
  lighthouse: { sky: ['#0c1216', '#1b282e', '#3a4a50'], fog: ['#26343c', 200, 1500], ambient: .5, sun: { dir: [-.3, .3, .85], k: .32 }, skyline: [], sea: { c1: '#1d3a48', c2: '#0c1a22', spark: '#a8c8d8' }, storm: 1, beam: 1 },
  dawn: { sky: ['#1f1a3a', '#6a3f6f', '#f29e6b'], fog: ['#8a7a8f', 400, 2200], ambient: .55, sun: { dir: [-.5, .6, .6], k: .5 }, skyline: [{ h: 24, col: '#3a2a4a', seed: 21, wide: 1 }], sea: { c1: '#2d6e86', c2: '#14404f', spark: '#ffd7a8' }, moon: { yaw: -.2, pitch: .12, r: 16, col: '#ffe0a0' } },
  turbine: { sky: ['#12141a', '#1c2028', '#2a303a'], fog: ['#1c2028', 300, 1100], ambient: .5, sun: { dir: [-.2, .1, .9], k: .3 }, skyline: [], sea: { c1: '#1c2028', c2: '#1c2028' } },
  tower: { sky: ['#1f1a3a', '#6a3f6f', '#f29e6b'], fog: ['#8a7a8f', 400, 2400], ambient: .55, sun: { dir: [-.5, .6, .6], k: .5 }, skyline: [{ h: 30, col: '#3a2a4a', seed: 22, wide: 1 }], sea: { c1: '#2d6e86', c2: '#14404f', spark: '#ffd7a8' }, moon: { yaw: .1, pitch: .15, r: 18, col: '#ffe0a0' } },
  control: { sky: ['#0a0e14', '#10161e', '#1a222c'], fog: ['#10161e', 300, 1000], ambient: .52, sun: { dir: [-.2, .1, .9], k: .3 }, skyline: [], sea: { c1: '#10161e', c2: '#10161e' } },
  range: { sky: ['#20242c', '#2c323c', '#3a424c'], fog: ['#2c323c', 300, 1000], ambient: .62, sun: { dir: [-.2, .1, .9], k: .3 }, skyline: [], sea: { c1: '#2c323c', c2: '#2c323c' } }
};
class Builder {
  constructor(sc) { this.boxes = []; this.solids = []; this.lights = []; this.sc = sc; }
  box(cx, cy, dx, dy, h, mat, z0 = 0, o) { const b = Object.assign({ x0: cx - dx / 2, x1: cx + dx / 2, y0: cy - dy / 2, y1: cy + dy / 2, z0, z1: z0 + h, mat }, o); this.boxes.push(b); if (b.solid) this.solids.push(b); return b; }
  raw(x0, y0, z0, x1, y1, z1, mat, o) { const b = Object.assign({ x0, x1, y0, y1, z0, z1, mat }, o); this.boxes.push(b); if (b.solid) this.solids.push(b); return b; }
  floor(x0, x1, y0, y1, z, mat, o) { return this.raw(x0, y0, z - 6, x1, y1, z, mat, Object.assign({ floor: 1, edge: false }, o)); }
  wall(x, y0, y1, h, mat, z0 = 0, o) { return this.raw(x, y0, z0, x + 10, y1, z0 + h, mat, Object.assign({ solid: 1 }, o)); }
  sideWall(y, x0, x1, h, mat, z0 = 0, o) { return this.raw(x0, y, z0, x1, y + 10, z0 + h, mat, o); }
  light(x, y, z, r, k, col) { this.lights.push({ x, y, z, r, k, col }); }
  lantern(x, y, z) { this.box(x, y, 4, 4, 5, 'lantern', z, { glow: 1, edge: false }); this.light(x, y, z, 90, .6); }
  post(x, y, h = 30, mat = 'wood_d') { this.box(x, y, 3, 3, h, mat); }
  lamppost(x, y, h = 46) { this.post(x, y, h, 'steel'); this.box(x, y, 7, 7, 4, 'lamp', h, { glow: 1, edge: false }); this.light(x, y, h, 140, .8); }
  lanternString(x, y0, y1, z) { const n = Math.max(2, ((y1 - y0) / 24) | 0), cols = ['neon_r', 'neon_y', 'neon_b', 'neon_g']; for (let i = 0; i <= n; i++) { const y = y0 + (y1 - y0) * i / n; this.box(x, y, 2.4, 2.4, 3, cols[i % 4], z - Math.sin(i / n * Math.PI) * -2 - 4 * Math.sin(i / n * Math.PI), { glow: 1, edge: false }); } this.box(x, (y0 + y1) / 2, 1, y1 - y0, 1, 'black', z + 2, { edge: false }); }
  stall(x, y, mat = 'awn_red') { this.box(x, y, 14, 30, 16, 'planks', 0, { solid: 1 }); this.box(x, y, 20, 38, 3, mat, 36); this.post(x + 8, y - 17, 36); this.post(x + 8, y + 17, 36); this.lantern(x - 6, y, 31); }
  crateStack(x, y, n = 2) { for (let i = 0; i < n; i++) this.box(x, y + i * 16 - (n - 1) * 8, 14, 15, 14, 'crate', 0, { solid: 1 }); if (n > 1) this.box(x, y, 13, 14, 13, 'crate', 14, { solid: 1 }); }
  container(x, y, col = 'corr_red', rot = 0, z0 = 0, h = 42) { if (rot) this.box(x, y, 39, 98, h, col, z0, { solid: 1 }); else this.box(x, y, 98, 39, h, col, z0, { solid: 1 }); }
  warehouse(x, y0, y1, h = 70, mat = 'brick') { this.wall(x, y0, y1, h, mat); for (let y = y0 + 30; y < y1 - 20; y += 60) this.box(x - 1, y, 2, 14, 16, 'glass', 34, { glow: 1, edge: false }); }
  door(x, y) { this.box(x - 1, y, 3, 18, 36, 'black', 0, { edge: false }); }
  skylineBoxes() { }
}
function defScene(id, spec) {
  const sc = Object.assign({ id, stage: +id[0], slots: [{ at: [0, -26, 24] }, { at: [0, 26, 24] }], covers: {}, waves: [], cues: [], objs: [], civ: [], env: 'harbor' }, spec);
  const b = new Builder(sc); if (sc.build) sc.build(b);
  const covers = {}; for (const k in sc.covers) {
    const c = sc.covers[k]; const cv = Object.assign({ w: 28, h: 16, d: 14, mat: 'crate', peek: ['up'], z0: 0 }, c);
    covers[k] = cv; if (!cv.hidden) b.box(cv.x, cv.y, cv.d, cv.w, cv.h, cv.mat, cv.z0, { solid: 1, coverOf: k });
  }
  sc.covers = covers; sc.boxes = b.boxes; sc.solids = b.solids; sc.lights = b.lights;
  sc.envData = Object.assign({}, ENVS[sc.env] || ENVS.harbor, sc.envOver || {}); sc.envData.lights = sc.lights;
  return def('scene', id, sc);
}
// shorthand for waves
const W_at = (at, spawn, o) => Object.assign({ at, spawn }, o), W_after = (spawn, o) => Object.assign({ after: 'clear', spawn }, o);
// validators (tests run these over every stage)
function validateContent() {
  const errs = [];
  for (const sid in TC.REG.stage) {
    const st = TC.REG.stage[sid];
    for (const id of st.scenes) {
      const sc = reg('scene', id); if (!sc) { errs.push('missing scene ' + id); continue; }
      for (const w of sc.waves) for (const sp of w.spawn || []) { if (!reg('enemy', sp[0])) errs.push(id + ': unknown enemy ' + sp[0]); if (sp[1] && !sc.covers[sp[1]]) errs.push(id + ': unknown cover ' + sp[1]); }
      for (const c of sc.cues) if (c.say && !reg('speaker', c.say[0])) errs.push(id + ': unknown speaker ' + c.say[0]);
      if (!reg('song', st.music)) errs.push('stage ' + sid + ': unknown song ' + st.music);
      if (sc.boss && !reg('boss', sc.boss)) errs.push(id + ': unknown boss ' + sc.boss);
      // covers must be on screen from every slot's stand pose
      sc.slots.forEach((sl, si) => {
        const pose = { x: sl.at[0], y: sl.at[1], z: sl.at[2] || 24, yaw: (sl.yaw || 0) * DEG, pitch: (sl.pitch || 0) * DEG, fov: 55 };
        for (const k in sc.covers) { const c = sc.covers[k]; if (c.hidden || c.perch) continue; const a = R3.aimOf(pose, [c.x + 12, c.y, c.z0 + 24]); if (!a) errs.push(id + ':' + k + ' behind slot ' + si); else if (Math.abs(a[0]) > 16 / 9 * 1.0 || Math.abs(a[1]) > 1.05) { if (!sc.moving && !sc.looseView) errs.push(id + ':' + k + ' off-screen from slot ' + si + ' (' + a[0].toFixed(2) + ',' + a[1].toFixed(2) + ')'); } }
      });
    }
  }
  return errs;
}
