(() => {
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true });
const rig = new E.Humanoid({ build: 'heroic', size: 1.05, weapon: 'gun', outfit: 'coat', hair: 'short', colors: { coat: '#2a2f45', pants: '#222', skin: '#e0b090' } });
const env = { sky: ['#0b1026', '#1b2a52', '#3a3060'], fog: ['#1a2242', 200, 1200], ambient: .45, sun: { dir: [-.35, .45, .82], k: .45 }, stars: 1, moon: { yaw: .1, pitch: .5 }, skyline: [{ h: 40, col: '#10152e', seed: 3, lit: '#ffb347' }] };
const boxes = [{ x0: -40, y0: -200, z0: -6, x1: 500, y1: 200, z1: 0, mat: 'planks' }, { x0: 60, y0: -40, z0: 0, x1: 80, y1: -10, z1: 15, mat: 'crate' }, { x0: 200, y0: 20, z0: 0, x1: 232, y1: 50, z1: 14, mat: 'crate' }, { x0: 300, y0: -120, z0: 0, x1: 400, y1: 120, z1: 60, mat: 'brick' }];
game.start({ scenes: { play: { pausable: false, update(dt) { rig.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, point: true, aim: 0 }); }, draw(r) {
  r.overlay(g => {
    const W = r.W, H = r.H; R3.setCam({ x: 0, y: 0, z: 24, yaw: 0, pitch: 0 }, W, H);
    const hy = R3.drawSky(g, env, game.time, W, H); R3.drawSea(g, env, game.time, W, H, hy);
    const list = []; for (const b of boxes) for (const q of R3.tess(b)) list.push({ k: R3.sortKey((q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2, (q.z0 + q.z1) / 2), b: q });
    for (const [x, y, ang] of [[150, -20, 0], [260, 40, 1], [100, 25, 2]]) list.push({ k: R3.sortKey(x, y, 10), a: [x, y, ang] });
    list.sort((p, q) => q.k - p.k);
    for (const it of list) { if (it.b) R3.drawBox(g, env, it.b, game.time); else {
      const p = R3.proj(it.a[0], it.a[1], 0); if (!p) continue; const k = R3.cam.F / p[2];
      const yaw = [0, 90, 180][it.a[2]] ;
      const v = new E.View('fp', 'FP', 0, 8, k, 1);
      rig.draw(g, Math.round(p[0]), Math.round(p[1]), v);
    } }
  });
} } }, scene: 'play' });
game.debug = { };
})();
