// The suites: each is a list of [name, fn]; fn throws on failure. Shared by tools/test.mjs.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadEngine } from '../node-env.mjs';
import { buildTrack } from '../../src/track/turtle.js';
import { TrackScene } from '../../src/track/scene.js';
import { makeCar, stepCar, TUNE, TUNE_DEFAULT } from '../../src/car/sim.js';
import { makeBot, botControls } from '../../src/race/bot.js';
import { Run, ghostAt, STEP_HZ } from '../../src/race/run.js';
import { TRACKS } from '../../src/data/tracks.js';
import { resetTuning, nudge, SLIDERS } from '../../src/config.js';
import { U } from '../../src/lib/vec.js';

const HERE = dirname(fileURLToPath(import.meta.url)), SRC = join(HERE, '..', '..', 'src');
const assert = (c, msg) => { if (!c) throw new Error(msg || 'assertion failed'); };
let E = null, game = null, world = null;
async function engine() {
  if (E) return;
  E = await loadEngine();
  game = new E.Game({ headless: true, res: 'ps1', expand: true, bg: null });
  await E.World3D.init(game);
  world = new E.World3D(game, { terrain: { height: () => -60 * U } });
}
const flatProgram = 'F 200';

export const suites = {
  turtle: [
    ['parses straights, bends, hills and checkpoints', () => {
      const T = buildTrack('F 40; Y 90 30; F 20; C; P 10 40; F 20');
      assert(T.n > 60, 'length'); assert(T.gates.length === 2, 'two gates: checkpoint and finish');
      assert(Math.abs(T.F[0][0] - 1) < 1e-9, 'starts heading east');
    }],
    ['frames are right-handed and level on the flat', () => {
      const T = buildTrack('F 60; Y 60 30; F 30; P 15 40; F 30');
      for (let i = 0; i < T.n; i += 9) {
        const f = T.F[i], r = T.R[i], u = T.U[i];
        const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
        assert(Math.abs(dot(f, r)) < 1e-6 && Math.abs(dot(f, u)) < 1e-6 && Math.abs(dot(r, u)) < 1e-6, 'orthogonal at ' + i);
        assert(Math.abs(dot(r, [-f[1], f[0], 0]) - Math.hypot(r[0], r[1]) * Math.hypot(f[0], f[1]) * 0 - dot(r, [-f[1], f[0], 0])) < 1e-9, 'same side');
        assert(u[2] > 0 || Math.abs(f[2]) > .9, 'up points up unless nose-up');
      }
    }],
    ['rejects an unknown command', () => { let threw = false; try { buildTrack('Q 5'); } catch (e) { threw = true; } assert(threw, 'should throw'); }],
    ['every shipped road builds and has its gates in order', () => {
      for (const t of TRACKS) { const T = buildTrack(t.program); for (let k = 1; k < T.gates.length; k++) assert(T.gates[k].i > T.gates[k - 1].i, t.id + ' gates in order'); }
    }],
  ],
  car: [
    ['sits on the flat road and holds still', async () => {
      await engine(); const T = buildTrack(flatProgram), sc = new TrackScene(world, T), car = makeCar([0, 0, 0], [1, 0, 0], [0, 0, 1]);
      car.p = [0, 0, (TUNE.ride + .3) * U];
      for (let k = 0; k < 240; k++) stepCar(car, { steer: 0, gas: 0, brake: 0 }, 1 / 120, sc, TUNE);
      assert(car.grounded, 'grounded'); assert(Math.abs(car.p[2] / U - TUNE.ride) < .15, 'rides at ' + (car.p[2] / U).toFixed(2));
      sc.dispose();
    }],
    ['accelerates with the throttle and brakes to a stop', async () => {
      await engine(); const T = buildTrack(flatProgram), sc = new TrackScene(world, T), car = makeCar([0, 0, 0], [1, 0, 0], [0, 0, 1]);
      car.p = [0, 0, (TUNE.ride + .3) * U];
      for (let k = 0; k < 600; k++) stepCar(car, { steer: 0, gas: 1, brake: 0 }, 1 / 120, sc, TUNE);
      const v = Math.hypot(...car.v) / U; assert(v > 20, 'speed after 5 s: ' + v.toFixed(1));
      for (let k = 0; k < 720; k++) stepCar(car, { steer: 0, gas: 0, brake: 1 }, 1 / 120, sc, TUNE);
      const fwd = (car.v[0] * car.f[0] + car.v[1] * car.f[1] + car.v[2] * car.f[2]) / U;
      assert(fwd < 2, 'stopped: forward speed ' + fwd.toFixed(1) + ' m/s');   // (held brake then reverses: that is by design)
      sc.dispose();
    }],
    ['falls off the edge of the road when there is none', async () => {
      await engine(); const T = buildTrack('F 30'), sc = new TrackScene(world, T), car = makeCar([0, 0, 0], [1, 0, 0], [0, 0, 1]);
      car.p = [0, 0, 1 * U]; car.p[1] = 30 * U;   // well off the road (the road is 10 m wide)
      for (let k = 0; k < 240; k++) stepCar(car, { steer: 0, gas: 0, brake: 0 }, 1 / 120, sc, TUNE);
      assert(!car.grounded, 'in the air off the road'); sc.dispose();
    }],
  ],
  bot: [
    ['finishes every shipped road with no respawns', async () => {
      await engine();
      for (const t of TRACKS) {
        const T = buildTrack(t.program), sc = new TrackScene(world, T), run = new Run(T, makeCar([0, 0, 0], [1, 0, 0], [0, 0, 1]), {}), bot = makeBot(T, 1);
        for (let n = 0; run.phase !== 'done' && n < STEP_HZ * 240; n++) run.step(1 / STEP_HZ, run.phase === 'run' ? botControls(run.car, bot) : { steer: 0, gas: 0, brake: 0 }, sc);
        sc.dispose();
        assert(run.phase === 'done', t.id + ' not finished (bot at sample ' + bot.i + ' of ' + T.n + ')');
        assert(run.respawns === 0, t.id + ' needed ' + run.respawns + ' respawns');
      }
    }],
  ],
  run: [
    ['counts down, then the clock runs in whole steps', async () => {
      await engine(); const T = buildTrack(flatProgram), sc = new TrackScene(world, T), run = new Run(T, makeCar([0, 0, 0], [1, 0, 0], [0, 0, 1]), {});
      for (let n = 0; run.phase === 'count' && n < 1000; n++) run.step(1 / 120, { steer: 0, gas: 0, brake: 0 }, sc);
      assert(run.phase === 'run', 'went to run'); assert(run.steps === 0, 'no steps during countdown');
      run.step(1 / 120, { steer: 0, gas: 0, brake: 0 }, sc); assert(run.steps === 1, 'one step'); assert(run.ms() === Math.round(1000 / 120), 'ms');
      sc.dispose();
    }],
    ['restart goes to the line and counts down again', async () => {
      await engine(); const T = buildTrack(flatProgram), sc = new TrackScene(world, T), run = new Run(T, makeCar([0, 0, 0], [1, 0, 0], [0, 0, 1]), {});
      for (let n = 0; n < 1000 && run.phase !== 'run'; n++) run.step(1 / 120, { steer: 0, gas: 1, brake: 0 }, sc);
      for (let n = 0; n < 300; n++) run.step(1 / 120, { steer: 0, gas: 1, brake: 0 }, sc);
      run.restart(); assert(run.phase === 'count' && run.steps === 0, 'reset');
      sc.dispose();
    }],
    ['respawn goes back to the last checkpoint and the clock keeps going', async () => {
      await engine(); const T = buildTrack('F 40; C; F 40; C; F 20'), sc = new TrackScene(world, T), run = new Run(T, makeCar([0, 0, 0], [1, 0, 0], [0, 0, 1]), {});
      run.phase = 'run'; run.placeCar(0);
      run.lastGate = 0; run.nextGate = 1; run.steps = 500;
      run.respawn(); assert(run.respawns === 1, 'counted'); assert(run.steps === 500, 'clock kept');
      assert(run.car.p[0] / U > 38.5 && run.car.p[0] / U < 41, 'placed at the first checkpoint, x=' + (run.car.p[0] / U).toFixed(1));
      sc.dispose();
    }],
    ['the ghost is recorded at 30 a second and plays back', async () => {
      await engine(); const T = buildTrack(flatProgram), sc = new TrackScene(world, T), run = new Run(T, makeCar([0, 0, 0], [1, 0, 0], [0, 0, 1]), { ghost: { frames: [] } });
      run.phase = 'run';
      for (let n = 0; n < 120; n++) run.step(1 / 120, { steer: 0, gas: 1, brake: 0 }, sc);
      assert(run.recorded.length >= 28 && run.recorded.length <= 32, 'frames ' + run.recorded.length);
      const g = { frames: run.recorded }, pose = ghostAt(g, 40); assert(pose && pose.p.length === 3, 'pose');
      sc.dispose();
    }],
  ],
  ui: [
    ['the scenes run: title, road select, race, finish, results, retry', async () => {
      const { boot } = await import('../../src/headless.mjs');
      const { game: g, api } = await boot(); await g.booted;
      api.S.profile.introSeen = true; api.S.talk = null;   // (the first-run intro would sit in front of the menu)
      const I = g.input, S = api.S;
      for (let k = 0; k < 4 && g.sceneName === 'title'; k++) { I.tap('confirm'); g.advance(.3); }
      assert(g.sceneName === 'select', 'select, was ' + g.sceneName);
      for (let k = 0; k < 4 && g.sceneName === 'select'; k++) { I.tap('confirm'); g.advance(.3); }
      assert(g.sceneName === 'race', 'race, was ' + g.sceneName);
      S.dev.bot = true;
      for (let k = 0; k < 120 * 120 && g.sceneName === 'race'; k++) g.advance(1 / 120);
      for (let k = 0; k < 400 && g.sceneName !== 'results'; k++) g.advance(1 / 120);
      assert(g.sceneName === 'results', 'results, was ' + g.sceneName);
      S.talk = null;   // (the first-finish beat's dialog would take the press)
      I.tap('confirm'); g.advance(.3); assert(g.sceneName === 'race', 'retry races again');
      assert((g.errors || []).length === 0, 'no engine errors: ' + (g.errors || []).map(e => e.message || e).join('; '));
    }],
    ['survival: a round ends with a ranking and the player goes on or is out', async () => {
      const { boot } = await import('../../src/headless.mjs');
      const { game: g, api } = await boot(); await g.booted;
      const S = api.S;
      g.go('race', { survival: true }); g.advance(1); S.dev.bot = true;
      assert(S.mode && S.mode.kind === 'survival' && S.rivals.length === 3, 'round set up');
      S.dev.bot = true;
      for (let k = 0; k < 120 * 900 && g.sceneName === 'race'; k++) g.advance(1 / 120);
      for (let k = 0; k < 400 && g.sceneName !== 'results'; k++) g.advance(1 / 120);
      assert(g.sceneName === 'results', 'results after the gauntlet or a loss, was ' + g.sceneName);
      assert(api.S.res && api.S.res.survival && api.S.res.ranked.length === 4, 'four ranked');
    }],
    ['hot seat: the cup standings add up per player', async () => {
      const { boot } = await import('../../src/headless.mjs');
      const { game: g, api } = await boot(); await g.booted;
      api.startHotSeat(2); g.advance(.1);
      assert(api.S.hot && api.S.hot.players.length === 2, 'two players');
      api.S.hot.times[0].push(60000); api.S.hot.times[1].push(50000);
      const st = api.standings(); assert(st[0].total === 50000 && st[0].name === 'PLAYER 2', 'lowest total first');
    }],
    ['garage: coppers buy a paint and it is equipped', async () => {
      const { boot } = await import('../../src/headless.mjs');
      const { game: g, api } = await boot(); await g.booted;
      const p = api.S.profile; p.coppers = 10; api.S.profile.owned = ['ember'];
      const { coppersFor, PAINTS } = await import('../../src/modes.js');
      assert(coppersFor(3, null) === 5 && coppersFor(2, 3) === 0 && coppersFor(1, 0) === 1, 'copper rules');
      assert(PAINTS.length === 6 && PAINTS[0].cost === 0, 'paints');
    }],
    ['dev mode sliders change the car and reset to the defaults', async () => {
      const s = SLIDERS[0], before = TUNE[s.key];
      nudge(s, 1); assert(TUNE[s.key] !== before, 'moved');
      resetTuning(); for (const k of Object.keys(TUNE_DEFAULT)) assert(TUNE[k] === TUNE_DEFAULT[k], 'reset ' + k);
    }],
    ['the attract demo runs and ends on any input', async () => {
      const { boot } = await import('../../src/headless.mjs');
      const { game: g, api } = await boot(); await g.booted;
      api.S.profile.introSeen = true; api.S.talk = null;
      g.advance(11);
      assert(g.sceneName === 'attract', 'attract after 10 s idle, was ' + g.sceneName);
      g.input.tap('confirm'); g.advance(.3);
      assert(g.sceneName === 'title', 'any input leaves it, was ' + g.sceneName);
    }],
  ],
  online: [
    ['ghost session: same road for all, poses and progress sent, result sent once, remote ghosts drawn', async () => {
      const calls = { send: [], progress: [], result: [] }, handlers = {};
      let t = -Infinity;
      globalThis.AIHub = {
        active: true, seeded: true, me: 0,
        connect: async () => ({ me: 0, players: [{ id: 0, name: 'A', color: '#e8443a' }, { id: 1, name: 'B', color: '#3b82f6' }], mode: 'ghost', round: 1, seed: 7 }),
        ready() {}, on(k, fn) { handlers[k] = fn; return () => {}; },
        send(d, o) { calls.send.push(d); return true; }, progress(p) { calls.progress.push(p); }, result(r) { calls.result.push(r); },
        time: () => t, rng: () => () => 0.3,
      };
      try {
        const { boot } = await import('../../src/headless.mjs');
        const { game: g, api } = await boot(); await g.booted;
        g.advance(1);
        assert(g.sceneName === 'session', 'session scene, was ' + g.sceneName);
        await new Promise(r => setTimeout(r, 10));
        handlers.start({ in: 3000 });
        g.advance(1);
        assert(g.sceneName === 'race' && api.S.session.race, 'race started, was ' + g.sceneName);
        handlers.message({ p: [0, 0, 0], f: [1, 0, 0], u: [0, 0, 1] }, 1);
        api.S.dev.bot = true;
        t = 0;
        for (let k = 0; k < 120 * 200 && api.S.race.phase !== 'done'; k++) g.advance(1 / 120);
        assert(calls.result.length === 1 && calls.result[0].time > 0, 'one result, time ' + JSON.stringify(calls.result));
        assert(calls.send.length > 20 && calls.send[0].p.length === 3, 'poses sent');
        assert(calls.progress.length >= 1, 'progress sent');
        assert(api.S.remote['1'], 'remote ghost stored');
        assert((g.errors || []).length === 0, 'no errors: ' + (g.errors || []).map(e => e.message || e).join('; '));
      } finally { delete globalThis.AIHub; }
    }],
  ],
  editor: [
    ['every puzzle has a solution that the bot drives to its goal within the budget', async () => {
      const { PUZZLES, PIECES } = await import('../../src/data/editor.js');
      const { programOf } = await import('../../src/data/editor.js');
      await engine();
      for (const p of PUZZLES) {
        assert(p.solution.length <= p.max, p.id + ' solution fits the budget');
        const prog = programOf(p.solution), T = buildTrack(prog), sc = new TrackScene(world, T);
        const run = new Run(T, makeCar([0, 0, 0], [1, 0, 0], [0, 0, 1]), {}), bot = makeBot(T, 1);
        for (let n = 0; run.phase !== 'done' && n < STEP_HZ * 240; n++) run.step(1 / STEP_HZ, run.phase === 'run' ? botControls(run.car, bot) : { steer: 0, gas: 0, brake: 0 }, sc);
        sc.dispose();
        assert(run.phase === 'done', p.id + ' not finished');
        assert(T.length >= p.goal, p.id + ' length ' + T.length.toFixed(0) + ' below goal ' + p.goal);
      }
      assert(PIECES.length >= 8, 'palette');
    }],
    ['the editor adds, undoes and enforces the puzzle budget', async () => {
      const { newEditor, addPiece, undo, canAdd } = await import('../../src/editor.js');
      const { PUZZLES } = await import('../../src/data/editor.js');
      const ed = newEditor(PUZZLES[2]);
      assert(addPiece(ed) && addPiece(ed), 'two pieces');
      assert(!canAdd(ed) && !addPiece(ed), 'budget stops a third');
      undo(ed); assert(ed.ids.length === 1 && canAdd(ed), 'undo frees a piece');
    }],
    ['road slots save and load', async () => {
      const { makeRoadStore } = await import('../../src/editor.js');
      const st = makeRoadStore({});
      st.save(1, ['f30', 'bl']); assert(JSON.stringify(st.load(1)) === JSON.stringify(['f30', 'bl']), 'loaded back');
      assert(st.load(0) === null, 'empty slot');
    }],
  ],
  playthrough: [
    ['a scripted playthrough: every road, a puzzle, the gauntlet, a hot-seat cup, a replay', async () => {
      const { boot } = await import('../../src/headless.mjs');
      const { PUZZLES } = await import('../../src/data/editor.js');
      const { game: g, api } = await boot(); await g.booted;
      const S = api.S;
      S.profile.introSeen = true; S.talk = null;
      g.advance(1);
      const finish = (max) => { for (let k = 0; k < max && g.sceneName !== 'results'; k++) g.advance(1 / 120); return g.sceneName === 'results'; };
      // 1. every road, by the bot, with its medal and copper
      for (const t of TRACKS) {
        g.go('race', { track: t }); g.advance(1); S.dev.bot = true;
        assert(finish(120 * 240), t.id + ' did not finish');
        assert(api.bestOf(t.id), t.id + ' has no best time');
        g.advance(1.5);
      }
      assert(S.profile.coppers > 0, 'coppers earned');
      // 2. a replay of a road, from the library's saved ghost
      const b = api.bestOf(TRACKS[0].id);
      g.go('replay', { track: TRACKS[0], frames: b.ghost.frames, ms: b.ms }); g.advance(1);
      for (let k = 0; k < 120 * 200 && g.sceneName === 'replay'; k++) g.advance(1 / 120);
      assert(g.sceneName !== 'replay', 'replay ends');
      // 3. a puzzle, solved in the editor's road and driven
      const P = PUZZLES[0], prog = (await import('../../src/data/editor.js')).programOf(P.solution);
      g.go('race', { track: { id: 'build', name: P.name, env: 'DUSTBOWL', program: prog }, puzzle: P }); g.advance(1); S.dev.bot = true;
      assert(finish(120 * 240), 'puzzle road did not finish');
      assert(S.profile.puzzles && S.profile.puzzles[P.id], 'puzzle solved');
      g.advance(1.5);
      // 4. the survival gauntlet, until out or cleared
      g.go('race', { survival: true }); g.advance(1); S.dev.bot = true;
      for (let k = 0; k < 120 * 900 && g.sceneName === 'race'; k++) g.advance(1 / 120);
      assert(g.sceneName === 'results', 'gauntlet ends in results');
      g.advance(1.5);
      // 5. a hot-seat cup for two players
      g.go('race', { hotseat: 2 }); g.advance(1); S.dev.bot = true;
      for (let k = 0; k < 120 * 900 && g.sceneName === 'race'; k++) g.advance(1 / 120);
      assert(g.sceneName === 'results', 'cup ends in standings');
      assert((g.errors || []).length === 0, 'no engine errors: ' + (g.errors || []).map(e => e.message || e).join('; '));
    }],
  ],
  build: [
    ['the source has no TODOs, placeholders or stubs', () => {
      const bad = [];
      const walk = d => { for (const f of readdirSync(d, { withFileTypes: true })) { const p = join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.(m?js)$/.test(f.name)) { const s = readFileSync(p, 'utf8'); if (/\b(TODO|FIXME|XXX|placeholder|lorem)\b/i.test(s)) bad.push(p); } } };
      walk(SRC); assert(bad.length === 0, 'found in: ' + bad.join(', '));
    }],
  ],
};
