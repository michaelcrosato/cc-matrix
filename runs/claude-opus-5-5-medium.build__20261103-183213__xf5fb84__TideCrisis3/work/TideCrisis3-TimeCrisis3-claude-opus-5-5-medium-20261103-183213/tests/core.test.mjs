import { simAt, run } from './lib.mjs';
export default async t => {
  const { TC, game, step } = t.load(); step(1.2); const M = TC.math;
  // math3d: projection round trip, the yaw convention, ray tests
  const cs = TC.camSetup({ x: 0, y: 0, z: 24, yaw: 0, pitch: 0, fov: 55, aspect: 16 / 9 });
  t.check('yaw 0 looks east', Math.abs(cs.f[0] - 1) < 1e-9 && Math.abs(cs.f[1]) < 1e-9);
  t.check('looking east, right is +y (south)', cs.r[1] > .99);
  const p = [200, 30, 40], v = TC.projectVU(cs, p), d = TC.aimRay(cs, v[0], v[1]), back = M.vadd(cs.pos, M.vmul(d, v[2] / M.vdot(d, cs.f)));
  t.check('project -> aim ray -> point round trip', M.vdist(back, p) < .01, M.vdist(back, p));
  t.check('ray vs AABB', Math.abs(TC.rayAABB([0, 0, 0], [1, 0, 0], [10, -1, -1, 12, 1, 1]) - 10) < 1e-6);
  t.check('ray vs sphere', Math.abs(TC.raySphere([0, 0, 0], [1, 0, 0], [20, 0, 0], 2) - 18) < 1e-6);
  t.check('ray misses a sphere to the side', TC.raySphere([0, 0, 0], [1, 0, 0], [20, 5, 0], 2) === Infinity);
  t.check('ray vs capsule', TC.rayCapsule([0, 0, 10], [1, 0, 0], [30, 0, 0], [30, 0, 20], 3) < Infinity);
  // raster: near clipping, the depth test, billboard compositing on synthetic pixels
  const R = new TC.Rail3D(); R.depth = null; R.W = 0;
  R.resize = function (W, H) { this.W = W; this.H = H; this.depth = new Float32Array(W * H); this.col = new Uint32Array(W * H); };
  R.begin({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0, fov: 60 }, 32, 32, { fog: ['#000000', 1000, 2000], ambient: 1 }, 0);
  const red = TC.mat('#ff0000'), blue = TC.mat('#0000ff');
  R._tri(50, -40, -40, 50, 40, -40, 50, 0, 40, 0, 0, 1, 0, 0, 1, .8, .8, .8, red, 0);
  const near = R.col[16 * 32 + 16];
  R._tri(100, -60, -60, 100, 60, -60, 100, 0, 60, 0, 0, 1, 0, 0, 1, .8, .8, .8, blue, 0);
  t.check('depth test: a far triangle never covers a near one', R.col[16 * 32 + 16] === near && near !== 0);
  R._tri(-5, -10, 0, 30, 0, 0, 30, 5, 5, 0, 0, 1, 0, 0, 1, 1, 1, 1, red, 0);
  t.check('near clipping makes no NaN', !Array.from(R.depth).some(x => Number.isNaN(x)));
  t.check('every material builds 5 bands', ['planks', 'concrete', 'crate', 'sea-night', 'lantern', '#336699'].every(id => TC.mat(id).bands.length === 5 && TC.mat(id).bands.every(b => b.length === 1024)));
  // registries and tune
  t.check('weapons registered', TC.WEAPONS.every(w => TC.REG.weapon[w]));
  TC.tset('enemy.hpMul', 2); t.check('tune paths set', TC.tune().enemy.hpMul === 2); TC.resetTune(); t.check('reset restores TUNE', JSON.stringify(TC.tune()) === JSON.stringify(TC.TUNE));
  t.check('no errors', !game.errors.length, game.errors.map(e => e.message).join('|'));
};
