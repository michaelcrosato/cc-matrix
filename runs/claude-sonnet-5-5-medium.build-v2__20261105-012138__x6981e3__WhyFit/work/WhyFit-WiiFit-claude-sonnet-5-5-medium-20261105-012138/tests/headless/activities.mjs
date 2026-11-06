// Test 4: every activity: idle bot finishes with 0 stars; expert bot reaches 2+ (3 on easy ones); sloppy < expert; result written; Drips correct.
import { boot, go, play } from '../../tools/lib-node.mjs';
import { newSlot } from '../../src/core/save.js';
import { ACT_ORDER, ACTIVITIES } from '../../src/data/activities.js';
import { dripsFor } from '../../src/core/progress.js';
const EASY = new Set(['tree', 'heron', 'squat', 'hoop', 'step', 'header', 'slack', 'tray', 'jog', 'pier', 'lunge']);
export default async function (t) {
  const { app, engine } = await boot('title'); engine.step(10);
  app.save.clear(); app.openSlot(0, newSlot('T', 0)); app.slot.day = 1;
  const run = async (id, skill, hard = false) => {
    await go(engine, 'activity', { id, skipIntro: true, skill, hard });
    const ok = await play(engine, () => app.scene.phase === 'results', 260);
    t.ok(ok, `${id} ${skill} finishes`);
    return { r: app.scene.result, rep: app.scene.report };
  };
  for (const id of ACT_ORDER) {
    const idle = await run(id, 'idle'), sloppy = await run(id, 'sloppy');
    const d0 = app.slot.drips; const ex = await run(id, 'expert');
    t.eq(idle.r.stars, 0, `${id}: idle bot gets 0 stars (score ${idle.r.score})`);
    t.ok(ex.r.stars >= (EASY.has(id) ? 3 : 2), `${id}: expert gets ${EASY.has(id) ? 3 : 2}+ stars (got ${ex.r.stars}, score ${ex.r.score})`);
    t.ok(sloppy.r.score < ex.r.score, `${id}: sloppy (${sloppy.r.score}) < expert (${ex.r.score})`);
    t.eq(app.slot.drips - d0, ex.rep.drips + ex.rep.goalBonus, `${id}: Drips applied`);
    t.eq(ex.rep.drips, dripsFor(ex.r.stars, ex.r.seconds), `${id}: Drips = 2 + 3*stars + floor(seconds/30)`);
    t.ok((app.slot.best[id] ?? -1) >= ex.r.score, `${id}: best record written`);
  }
  // hard versions run
  for (const id of ['tree', 'hoop', 'header']) { const h = await run(id, 'expert', true); t.ok(h.r.score >= 0, `${id} hard runs`); }
  t.eq(engine.errors.length, 0, 'no engine errors: ' + engine.errors.slice(0, 2).join(' | '));
}
