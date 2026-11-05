(() => {
const E = My3D2dge, TC = window.TC;
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, menu: false, corner: false, fullscreen: false });
const G = new TC.Builder();
G.box('pier', -200, -60, 0, 600, 60, 4);               // pier deck
for (let x = -200; x < 600; x += 40) for (const y of [-58, 58]) G.cyl('pier-dk', x, y, -40, 3, 40, { seg: 6 });
G.box('crate', 30, -40, 4, 45, -25, 18); G.box('crate', 30, -25, 4, 45, -10, 18); G.box('crate', 32, -36, 18, 46, -22, 32);
G.box('barrel', 30, 20, 4, 42, 32, 20);
G.box('brick', 380, -200, 0, 460, 200, 90, { top: 'slate' });   // warehouse
G.box('corr-red', 220, 70, 4, 318, 109, 46); G.box('corr-blue', 220, -150, 4, 318, -111, 46);
G.shape('barrel', 150, -40, 4, { scale: 1.1 }); G.shape('crate', 170, 30, 4); G.shape('lamppost', 120, -55, 4);
G.box('awning-red', 140, 30, 30, 190, 55, 31, { solid: false });
G.quad('sea-night', [-2000, -2000, -24], [3000, -2000, -24], [3000, 2000, -24], [-2000, 2000, -24], { maxEdge: 400 });
G.light(120, -55, 40, 90, .7); G.light(200, 40, 30, 90, .6);
const env = { ambient: .32, sun: { dir: [-.35, .45, .82], k: .35 }, fog: ['#1a2242', 400, 2000], warm: '#ffb347',
  sky: { colors: ['#0b1026', '#1b2a52', '#3a3060'], glow: '#c04a8a', stars: true, moon: { dir: [.6, -.5, .45], r: 2.4 }, clouds: '#2a3a6a', layers: [{ kind: 'city', color: '#0e1430', lit: '#ffd88a', height: .07, seed: 3 }] } };
const world = TC.bakeWorld(G, env);
console.log('tris', world.tris, 'chunks', world.chunks.length);
const r3 = new TC.Rail3D();
const rigs = [];
const mk = (o) => { const r = new E.Humanoid(Object.assign({ size: 1.05, build: 'heroic', weapon: 'rifle', outfit: 'shirt', sleeves: 'long', hat: 'cap', colors: { cloth: '#2a3454', pants: '#2a2e3a', hair: '#2a2018', skin: '#c8906a', metal: '#3a3e48' } }, o)); return r; };
rigs.push({ rig: mk({}), x: 52, y: -32, z: 4 }); rigs.push({ rig: mk({ build: 'bulky' }), x: 260, y: 0, z: 4 }); rigs.push({ rig: mk({}), x: 520, y: 40, z: 4 });
let t = 0;
game.start({ update(dt) { t += dt; for (const a of rigs) a.rig.update(dt, { x: a.x, y: a.y, z: a.z, facing: Math.PI, point: true, aim: .05 * Math.sin(t) }); },
  draw(r) {
    r.overlay(g => {
      const W = r.W + 2, H = r.H + 2; r3.size(W, H);
      const cam = { x: -40 + Math.sin(t * .3) * 10, y: -8, z: 24, yaw: 0.0 + Math.sin(t * .2) * .2, pitch: -.04, fov: 55 };
      r3.begin(cam, env, t); r3.addLight(60, -30, 26, 60, .5 + .5 * Math.sin(t * 8));
      r3.drawWorld(world);
      for (const a of rigs) { r3.shadow(a.x, a.y, a.z); r3.drawRig(a.rig, a.x, a.y, a.z); }
      r3.glow(120, -55, 40, 10, [255, 180, 80]);
      r3.sky();
      r3.present(g, -1, -1);
      E.font.text(g, 'tris ' + r3.stats.tris + ' px ' + r3.stats.px, 4, 4, '#fff', { shadow: '#000' });
    });
  } });
window.__spike = { world, r3 };
})();
