// Test 11: Medley: 4 bot lanes, scores in range, windows respected; a ghost lane never simulates.
import { boot, go, play, wait } from '../../tools/lib-node.mjs';
import { newSlot } from '../../src/core/save.js';
import { windowStart, windowEnd, norm, MedleyState } from '../../src/core/medley.js';
import { EVENTS, EVENT_SECS, GAP_SECS } from '../../src/data/medley.js';
export default async function (t) {
  t.eq(EVENT_SECS, 55, '55 s events'); t.eq(GAP_SECS, 10, '10 s gaps'); t.eq([windowStart(1), windowEnd(1), windowStart(2)], [65, 120, 130], 'fixed windows');
  const r = () => 0.5, m = new MedleyState([{ name: 'a' }, { name: 'b' }], r);
  t.eq(m.picks.length, 3, 'three picks'); t.ok(EVENTS.every((e, i) => e.pool.includes(m.picks[i])), 'picks come from each event pool');
  const { app, engine } = await boot('title'); engine.step(10); app.save.clear(); app.openSlot(0, newSlot('T', 0));
  const specs = [{ kind: 'bot', skill: 'sloppy', name: 'A' }, { kind: 'bot', skill: 'average', name: 'B' }, { kind: 'bot', skill: 'good', name: 'C' }, { kind: 'bot', skill: 'expert', name: 'D' }];
  app.startMedley(specs);
  let startedAt = [null, null, null]; const seen = [];
  await play(engine, () => { const sc = app.scene; if (sc?.medley && sc.phase === 'countdown' && startedAt[sc.event] === null) startedAt[sc.event] = sc.medleyNow(); return sc?.constructor?.id === 'podium'; }, 500);
  t.eq(app.scene.constructor.id, 'podium', 'the Medley ends on the podium');
  startedAt.forEach((s, k) => t.ok(s !== null && s >= windowStart(k) - 0.05, `event ${k + 1} starts inside its window (clock ${s})`));
  const sc = app.medley.scores; t.eq(sc.length, 3, 'three event rows');
  for (const row of sc) { t.eq(row.length, 4, 'a score per lane'); for (const v of row) t.ok(v >= 0 && v <= 1000, `score in 0..1000 (${v})`); }
  const tot = app.medley.totals(); t.ok(tot[3] > tot[0], 'expert beats sloppy over the Medley'); const rank = app.medley.ranking(); t.eq(rank.length, 4, 'ranking lists everyone'); t.ok(app.medley.awards().flat().length >= 3, 'awards are given');
  t.eq(norm('tree', 500), 1000, 'norm clamps to 1000'); t.eq(norm('tree', 0), 0, 'norm floor 0');
  // a ghost lane never simulates
  await go(engine, 'activity', { id: 'tree', skipIntro: true, medley: true, event: 0, lanes: [{ kind: 'local', name: 'Me', look: undefined }, { kind: 'ghost', pid: 1, name: 'Ghost' }] });
  app.medley = new MedleyState([{}, {}], () => 0.5); engine.step(1);
  const sc2 = app.scene; await wait(engine, 8);
  const g = sc2.lanes[1]; t.eq([g.dot.x, g.dot.y, g.dot.t], [0, 0, 0], 'a ghost lane never simulates its Dot');
  g.driver.push({ x: 0.5, y: -0.2, a: 0, c: 0, t: 0, s: 33 }); await wait(engine, 1); t.ok(Math.abs(g.driver.x - 0.5) < 0.2, 'a ghost lerps what it is sent'); t.eq(g.score, 33, 'and shows the score it reports');
  t.eq(engine.errors.length, 0, 'no errors: ' + engine.errors.slice(0, 2).join(' | '));
}
