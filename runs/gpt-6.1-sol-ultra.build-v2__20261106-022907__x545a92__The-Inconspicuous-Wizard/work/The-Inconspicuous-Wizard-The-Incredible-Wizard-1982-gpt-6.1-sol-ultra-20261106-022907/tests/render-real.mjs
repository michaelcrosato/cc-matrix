import fs from 'node:fs';
import vm from 'node:vm';
for (const f of [
  'vendor/my-3d2dge.js',
  'content/rooms.js',
  'src/sim.js',
  'src/render.js',
])
  vm.runInThisContext(
    fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8'),
    { filename: f },
  );
const E = My3D2dge,
  g = new E.Game({
    headless: true,
    draw: true,
    res: [640, 360],
    view: 'topdown',
    views: ['topdown'],
  }),
  renderer = new WizardRenderer(g),
  sim = new WizardSim.Sim({ seats: 2 });
g.start({
  view: 'topdown',
  camera: { zoom: false },
  update(dt) {
    sim.step(dt, [
      { move: 3, aim: 0, fire: true },
      { move: 3, aim: 2, fire: true },
    ]);
    renderer.update(sim.s, dt);
    renderer.frame(sim.s);
  },
  draw(r) {
    renderer.draw(sim.s, r);
  },
});
g.advance(2, { draw: true });
for (const r of renderer.rigs.values()) {
  if (r instanceof E.Blob && !Number.isFinite(r.sq))
    throw Error('Nonfinite native Blob squash from simulation IDs');
}
if (g.errors.length) throw Error(JSON.stringify(g.errors));
g.dispose();
console.log('Native renderer real-state integration passed');
