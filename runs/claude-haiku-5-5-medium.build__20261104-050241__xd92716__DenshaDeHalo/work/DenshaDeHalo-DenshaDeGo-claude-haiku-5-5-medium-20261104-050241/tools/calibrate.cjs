// Runs the autopilot in min-time mode ("par", section 4.8) over each stage that has a timetable, and prints the clock
// at each timetabled stop. Par should arrive 6-12 s early on Normal, so the timetable is set from it. Run: node tools/calibrate.cjs [S1 S2 ...]
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..');
const ctx = { console, Math, Date }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['src/00-core.js', 'src/21-route-compiler.js', 'src/30-train.js', 'src/31-sim.js', 'src/35-autopilot.js', 'src/22-stages.js'])
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const DH = ctx.DH;
DH.compiled = { halo: DH.compileRoute(DH.ROUTES.halo), depot: DH.compileRoute(DH.ROUTES.depot) };
const only = process.argv.slice(2);
for (const stage of DH.STAGES) {
  if (stage.route !== 'halo' || !stage.stops || (only.length && !only.includes(stage.id))) continue;
  const sim = new DH.Sim(Object.assign({}, stage, { frozenHalo: 25 }), DH.compiled.halo, {});   // (Halo Time frozen: par is measured, not scored)
  const auto = new DH.Auto(sim, { skill: 1, minTime: true });
  const at = {};
  const orig = sim.beginDwell.bind(sim);
  sim.beginDwell = (x, T0, initial) => { if (!initial) at[x.id] = DH.clock(T0); orig(x, T0, initial); };
  let n = 0;
  while (!sim.finished && !sim.gameOver && n < 120 * 3600) { auto.act(DH.FIXED); sim.step(DH.FIXED); n++; }
  const rows = stage.stops.map(x => `${x.id}: par ${at[x.id] || '-'} (timetable arr ${x.arr || '-'}${x.dep ? ' dep ' + x.dep : ''})`);
  console.log(stage.id, sim.finished ? 'finished' : 'NOT FINISHED', sim.gameOver ? 'GAME OVER' : '', '\n  ' + rows.join('\n  '));
}
process.exit(0);
