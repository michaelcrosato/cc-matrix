// Record a minute of the siege with scripted input, replay it, compare fingerprints.
import { boot, setup, step } from '../helpers.mjs';
import { Area } from '../../src/game/area.js';
import { app } from '../../src/core/app.js';
import { Run } from '../../src/core/run.js';

const makeRun = () => {
  const r = new Run();
  const d = r.areaData('quay');
  for (const b of ['arrival', 'tannoyHint', 'cottage', 'quayFront', 'shedHint']) d.beats[b] = true;
  return r;
};

export default async function (t) {
  setup({ run: makeRun() });
  app.dev.god = true;
  const e = await boot(new Area('quay', { start: [28, 20], noSave: true }));
  const script = [['KeyW', 60], ['ShiftLeft', 40], ['MouseRight', 80], ['KeyA', 40], ['KeyE', 4], ['KeyD', 50], ['MouseRight', 60]];
  const a = e.game;
  a.ctx.engine.input.addPointer(30, 0);
  await step(e, 30);
  for (let n = 0; n < 8; n++) {
    for (const [code, frames] of script) {
      e.input.setKey(code, true);
      if (code === 'MouseRight') e.input.setKey('MouseLeft', frames > 60);
      for (let i = 0; i < frames; i += 10) { e.step(Math.min(10, frames - i)); await new Promise((r) => setImmediate(r)); }
      e.input.setKey(code, false);
      e.input.setKey('MouseLeft', false);
      await step(e, 5);
      if (e.frame > 60 * 62) break;
    }
  }
  const end = e.fingerprint();
  const status = e.game.status();
  const rec = e.recording();
  t.ok(rec && rec.frames?.length > 1000, `recorded ${rec?.frames?.length} frames`);
  await e.replay(rec, () => { app.closeAll(); app.slow = 1; app.run = makeRun(); return e.loadGame(new Area('quay', { start: [28, 20], noSave: true })); });
  t.eq(e.game.status(), status, 'replay ends in the same status');
  t.eq(e.fingerprint(), end, 'replay ends with the same fingerprint');
  t.eq(e.errors.length, 0, `no errors: ${e.errors[0] ?? ''}`);
}
