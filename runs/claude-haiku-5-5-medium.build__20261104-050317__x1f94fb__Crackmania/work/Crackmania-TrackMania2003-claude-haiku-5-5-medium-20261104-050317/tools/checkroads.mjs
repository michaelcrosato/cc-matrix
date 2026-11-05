import { loadEngine } from './node-env.mjs';
import { buildTrack } from '../src/track/turtle.js';
import { TrackScene } from '../src/track/scene.js';
import { makeCar } from '../src/car/sim.js';
import { makeBot, botControls } from '../src/race/bot.js';
import { Run, STEP_HZ } from '../src/race/run.js';
import { TRACKS } from '../src/data/tracks.js';
import { U } from '../src/lib/vec.js';
const E = await loadEngine();
const game = new E.Game({ headless: true, res: 'ps1', expand: true, bg: null });
await E.World3D.init(game);
const w = new E.World3D(game, { terrain: { height: () => -60 * U } });
for (const tr of TRACKS.filter(t => t.id[0] !== 'd' || true)) {
  const T = buildTrack(tr.program), sc = new TrackScene(w, T), run = new Run(T, makeCar([0,0,0],[1,0,0],[0,0,1]), {}), bot = makeBot(T, 1);
  for (let n = 0; run.phase !== 'done' && n < STEP_HZ * 240; n++) run.step(1 / STEP_HZ, run.phase === 'run' ? botControls(run.car, bot) : { steer: 0, gas: 0, brake: 0 }, sc);
  sc.dispose();
  console.log(tr.id.padEnd(4), tr.name.padEnd(16), run.phase === 'done' ? 'ok ' + (run.ms()/1000).toFixed(1) + 's respawns ' + run.respawns : 'NOT FINISHED bot@' + bot.i + '/' + T.n + ' respawns ' + run.respawns);
}
